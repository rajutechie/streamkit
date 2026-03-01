{{/*
Expand the name of the chart.
*/}}
{{- define "streamkit.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "streamkit.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "streamkit.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels for a given service.
Usage: {{ include "streamkit.labels" (dict "serviceName" "api-gateway" "context" $) }}
*/}}
{{- define "streamkit.labels" -}}
helm.sh/chart: {{ include "streamkit.chart" .context }}
{{ include "streamkit.selectorLabels" (dict "serviceName" .serviceName "context" .context) }}
app.kubernetes.io/version: {{ .context.Values.global.imageTag | default .context.Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .context.Release.Service }}
app.kubernetes.io/part-of: streamkit-platform
{{- end }}

{{/*
Selector labels for a given service.
Usage: {{ include "streamkit.selectorLabels" (dict "serviceName" "api-gateway" "context" $) }}
*/}}
{{- define "streamkit.selectorLabels" -}}
app.kubernetes.io/name: {{ .serviceName }}
app.kubernetes.io/instance: {{ .context.Release.Name }}
{{- end }}

{{/*
Return the image for a service.
Usage: {{ include "streamkit.image" (dict "serviceConfig" .serviceConfig "context" $) }}
*/}}
{{- define "streamkit.image" -}}
{{- $registry := .context.Values.global.imageRegistry -}}
{{- $tag := .context.Values.global.imageTag | default .context.Chart.AppVersion -}}
{{- printf "%s:%s" .serviceConfig.image.repository $tag -}}
{{- end }}

{{/*
Return the namespace.
*/}}
{{- define "streamkit.namespace" -}}
{{- .Values.global.namespace | default .Release.Namespace }}
{{- end }}

{{/*
Return the component label for a service.
*/}}
{{- define "streamkit.component" -}}
{{- .component | default "service" }}
{{- end }}
