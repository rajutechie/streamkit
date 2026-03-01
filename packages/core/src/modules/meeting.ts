import { BaseModule } from './base';
import type {
  Meeting, MeetingConfig, UpdateMeetingInput,
  MeetingParticipant, MeetingPoll, CreatePollInput,
  BreakoutRoom, CreateBreakoutRoomsInput,
} from '../models/meeting';

export class MeetingModule extends BaseModule {
  async schedule(config: MeetingConfig): Promise<Meeting> {
    const { data } = await this.http.post<Meeting>('/meetings', config);
    return data;
  }

  async get(meetingId: string): Promise<Meeting> {
    const { data } = await this.http.get<Meeting>(`/meetings/${meetingId}`);
    return data;
  }

  async update(meetingId: string, input: UpdateMeetingInput): Promise<Meeting> {
    const { data } = await this.http.patch<Meeting>(`/meetings/${meetingId}`, input);
    return data;
  }

  async cancel(meetingId: string): Promise<void> {
    await this.http.delete(`/meetings/${meetingId}`);
  }

  async join(meetingId: string): Promise<MeetingParticipant> {
    const { data } = await this.http.post<MeetingParticipant>(`/meetings/${meetingId}/join`);
    return data;
  }

  async joinByCode(code: string): Promise<Meeting & { participant: MeetingParticipant }> {
    const { data } = await this.http.get<Meeting & { participant: MeetingParticipant }>(
      `/meetings/join/${code}`,
    );
    return data;
  }

  async leave(meetingId: string): Promise<void> {
    await this.http.post(`/meetings/${meetingId}/leave`);
  }

  async end(meetingId: string): Promise<void> {
    await this.http.post(`/meetings/${meetingId}/end`);
  }

  // ── Participant Management ──

  async muteParticipant(meetingId: string, userId: string): Promise<void> {
    await this.http.post(`/meetings/${meetingId}/participants/${userId}/mute`);
  }

  async removeParticipant(meetingId: string, userId: string): Promise<void> {
    await this.http.post(`/meetings/${meetingId}/participants/${userId}/remove`);
  }

  async muteAll(meetingId: string): Promise<void> {
    await this.http.post(`/meetings/${meetingId}/mute-all`);
  }

  // ── Hand Raise ──

  raiseHand(meetingId: string): void {
    this.ws.send('hand.raise', { meetingId });
  }

  lowerHand(meetingId: string): void {
    this.ws.send('hand.lower', { meetingId });
  }

  // ── Polls ──

  async createPoll(meetingId: string, poll: CreatePollInput): Promise<MeetingPoll> {
    const { data } = await this.http.post<MeetingPoll>(`/meetings/${meetingId}/polls`, poll);
    return data;
  }

  async votePoll(meetingId: string, pollId: string, optionId: string): Promise<void> {
    await this.http.post(`/meetings/${meetingId}/polls/${pollId}/vote`, { optionId });
  }

  // ── Breakout Rooms ──

  async createBreakoutRooms(
    meetingId: string,
    input: CreateBreakoutRoomsInput,
  ): Promise<BreakoutRoom[]> {
    const { data } = await this.http.post<BreakoutRoom[]>(
      `/meetings/${meetingId}/breakout-rooms`,
      input,
    );
    return data;
  }

  // ── Signaling ──

  sendSignal(meetingId: string, signal: Record<string, unknown>): void {
    this.ws.send('meeting.signal', { meetingId, ...signal });
  }
}
