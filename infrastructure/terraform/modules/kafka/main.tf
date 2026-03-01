resource "aws_security_group" "kafka" {
  name_prefix = "${var.project_name}-${var.environment}-msk-"
  description = "Security group for Amazon MSK cluster"
  vpc_id      = var.vpc_id

  tags = {
    Name = "${var.project_name}-${var.environment}-msk-sg"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "kafka_ingress_eks_tls" {
  description              = "Allow TLS access from EKS worker nodes"
  type                     = "ingress"
  from_port                = 9094
  to_port                  = 9094
  protocol                 = "tcp"
  source_security_group_id = var.eks_node_sg_id
  security_group_id        = aws_security_group.kafka.id
}

resource "aws_security_group_rule" "kafka_ingress_eks_plaintext" {
  description              = "Allow plaintext access from EKS worker nodes"
  type                     = "ingress"
  from_port                = 9092
  to_port                  = 9092
  protocol                 = "tcp"
  source_security_group_id = var.eks_node_sg_id
  security_group_id        = aws_security_group.kafka.id
}

resource "aws_security_group_rule" "kafka_ingress_zookeeper" {
  description              = "Allow Zookeeper access from EKS worker nodes"
  type                     = "ingress"
  from_port                = 2181
  to_port                  = 2181
  protocol                 = "tcp"
  source_security_group_id = var.eks_node_sg_id
  security_group_id        = aws_security_group.kafka.id
}

resource "aws_security_group_rule" "kafka_ingress_self" {
  description              = "Allow inter-broker communication"
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.kafka.id
  security_group_id        = aws_security_group.kafka.id
}

resource "aws_security_group_rule" "kafka_egress" {
  description       = "Allow all egress from MSK"
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.kafka.id
}

resource "aws_kms_key" "kafka" {
  description             = "KMS key for MSK ${var.project_name}-${var.environment} encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "${var.project_name}-${var.environment}-msk-kms"
  }
}

resource "aws_kms_alias" "kafka" {
  name          = "alias/${var.project_name}-${var.environment}-msk"
  target_key_id = aws_kms_key.kafka.key_id
}

resource "aws_cloudwatch_log_group" "kafka_broker" {
  name              = "/aws/msk/${var.project_name}-${var.environment}/broker"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.project_name}-${var.environment}-msk-broker-log"
  }
}

resource "aws_msk_configuration" "main" {
  name              = "${var.project_name}-${var.environment}-msk-config"
  kafka_versions    = [var.kafka_version]
  description       = "MSK configuration for ${var.project_name} ${var.environment}"

  server_properties = <<-PROPERTIES
    auto.create.topics.enable=false
    default.replication.factor=3
    min.insync.replicas=2
    num.io.threads=8
    num.network.threads=5
    num.partitions=6
    num.replica.fetchers=2
    replica.lag.time.max.ms=30000
    socket.receive.buffer.bytes=102400
    socket.request.max.bytes=104857600
    socket.send.buffer.bytes=102400
    unclean.leader.election.enable=false
    zookeeper.session.timeout.ms=18000
    log.retention.hours=168
    log.segment.bytes=1073741824
    log.retention.check.interval.ms=300000
    group.initial.rebalance.delay.ms=3000
  PROPERTIES

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_msk_cluster" "main" {
  cluster_name           = "${var.project_name}-${var.environment}"
  kafka_version          = var.kafka_version
  number_of_broker_nodes = var.number_of_brokers

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  broker_node_group_info {
    instance_type  = var.broker_instance_type
    client_subnets = var.private_subnet_ids
    security_groups = [aws_security_group.kafka.id]

    storage_info {
      ebs_storage_info {
        volume_size = var.ebs_volume_size

        provisioned_throughput {
          enabled           = var.ebs_volume_size >= 300
          volume_throughput = var.ebs_volume_size >= 300 ? 250 : 0
        }
      }
    }

    connectivity_info {
      public_access {
        type = "DISABLED"
      }
    }
  }

  encryption_info {
    encryption_at_rest_kms_key_arn = aws_kms_key.kafka.arn

    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
  }

  open_monitoring {
    prometheus {
      jmx_exporter {
        enabled_in_broker = true
      }
      node_exporter {
        enabled_in_broker = true
      }
    }
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.kafka_broker.name
      }
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-msk"
  }
}
