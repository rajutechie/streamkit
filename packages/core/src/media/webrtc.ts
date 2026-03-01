import { Logger } from '../utils/logger';

export interface MediaConstraints {
  audio: boolean | MediaTrackConstraints;
  video: boolean | MediaTrackConstraints;
}

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
}

export class DeviceManager {
  private logger = new Logger().child('DeviceManager');

  async enumerateDevices(): Promise<MediaDeviceInfo[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return [];
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'audioinput' || d.kind === 'audiooutput' || d.kind === 'videoinput')
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `${d.kind} (${d.deviceId.substring(0, 8)})`,
        kind: d.kind as MediaDeviceInfo['kind'],
      }));
  }

  async getUserMedia(constraints: MediaConstraints): Promise<MediaStream> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      throw new Error('Media devices not available');
    }
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  async getDisplayMedia(constraints?: DisplayMediaStreamOptions): Promise<MediaStream> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      throw new Error('Screen sharing not available');
    }
    return navigator.mediaDevices.getDisplayMedia(constraints ?? { video: true, audio: false });
  }

  stopTracks(stream: MediaStream): void {
    stream.getTracks().forEach((track) => track.stop());
  }

  async switchCamera(stream: MediaStream, deviceId: string): Promise<MediaStream> {
    this.stopTracks(stream);
    return this.getUserMedia({
      audio: true,
      video: { deviceId: { exact: deviceId } },
    });
  }
}
