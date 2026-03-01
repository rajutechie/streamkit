import { BaseModule } from './base';
import type { Call, CallConfig, CallParticipant, CallStats } from '../models/call';

export class CallModule extends BaseModule {
  async start(config: CallConfig): Promise<Call> {
    const { data } = await this.http.post<Call>('/calls', config);
    return data;
  }

  async get(callId: string): Promise<Call> {
    const { data } = await this.http.get<Call>(`/calls/${callId}`);
    return data;
  }

  async accept(callId: string): Promise<void> {
    await this.http.post(`/calls/${callId}/accept`);
  }

  async reject(callId: string, reason?: string): Promise<void> {
    await this.http.post(`/calls/${callId}/reject`, { reason });
  }

  async end(callId: string): Promise<void> {
    await this.http.post(`/calls/${callId}/end`);
  }

  async startRecording(callId: string): Promise<void> {
    await this.http.post(`/calls/${callId}/recording/start`);
  }

  async stopRecording(callId: string): Promise<void> {
    await this.http.post(`/calls/${callId}/recording/stop`);
  }

  async getStats(callId: string): Promise<CallStats> {
    const { data } = await this.http.get<CallStats>(`/calls/${callId}/stats`);
    return data;
  }

  toggleAudio(callId: string, enabled: boolean): void {
    this.ws.send('call.signal', {
      callId,
      action: 'toggle_audio',
      enabled,
    });
  }

  toggleVideo(callId: string, enabled: boolean): void {
    this.ws.send('call.signal', {
      callId,
      action: 'toggle_video',
      enabled,
    });
  }

  switchCamera(callId: string): void {
    this.ws.send('call.signal', {
      callId,
      action: 'switch_camera',
    });
  }

  startScreenShare(callId: string): void {
    this.ws.send('call.signal', {
      callId,
      action: 'start_screen_share',
    });
  }

  stopScreenShare(callId: string): void {
    this.ws.send('call.signal', {
      callId,
      action: 'stop_screen_share',
    });
  }

  sendSignal(callId: string, signal: { type: string; sdp?: string; candidate?: unknown }): void {
    this.ws.send('call.signal', {
      callId,
      signal,
    });
  }
}
