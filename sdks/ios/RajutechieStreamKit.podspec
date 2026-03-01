Pod::Spec.new do |s|
  s.name             = 'RajutechieStreamKit'
  s.version          = '1.0.0'
  s.summary          = 'A modern Swift SDK for real-time communication and streaming'
  
  s.description      = <<-DESC
    RajutechieStreamKit provides a comprehensive solution for building real-time
    communication features in your iOS and macOS apps. It includes support for:
    - Real-time chat with channels and reactions
    - Video and audio calls with screen sharing
    - Virtual meetings with polls and breakout rooms
    - Live streaming with HLS support
    
    Built with Swift Concurrency for seamless async/await integration.
  DESC

  s.homepage         = 'https://github.com/yourusername/RajutechieStreamKit'
  s.license          = { :type => 'MIT', :file => 'LICENSE' }
  s.author           = { 'RajutechieStreamKit Team' => 'support@rajutechie-streamkit.io' }
  s.source           = { :git => 'https://github.com/yourusername/RajutechieStreamKit.git', :tag => s.version.to_s }

  s.ios.deployment_target = '15.0'
  s.osx.deployment_target = '13.0'
  s.swift_version = '5.9'

  s.source_files = 'Sources/RajutechieStreamKit/**/*.swift'
  
  s.frameworks = 'Foundation'
  
  s.pod_target_xcconfig = {
    'SWIFT_VERSION' => '5.9'
  }
end
