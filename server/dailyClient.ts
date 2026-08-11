const DAILY_API_KEY = process.env.DAILY_API_KEY || '';
const DAILY_API_BASE = 'https://api.daily.co/v1';

interface DailyRoomOptions {
  name?: string;
  privacy?: 'public' | 'private';
  properties?: {
    enable_chat?: boolean;
    enable_screenshare?: boolean;
    enable_recording?: 'local' | 'cloud' | false;
    exp?: number;
    nbf?: number;
    max_participants?: number;
    start_audio_off?: boolean;
    start_video_off?: boolean;
  };
}

interface DailyRoom {
  id: string;
  name: string;
  api_created: boolean;
  privacy: string;
  url: string;
  created_at: string;
  config: any;
}

interface DailyMeetingToken {
  token: string;
}

export async function createDailyRoom(options: DailyRoomOptions = {}): Promise<DailyRoom> {
  if (!DAILY_API_KEY) {
    console.log('DAILY_API_KEY not set - returning mock room for development');
    const mockRoomName = `glowsense-${Date.now()}`;
    return {
      id: mockRoomName,
      name: mockRoomName,
      api_created: true,
      privacy: 'private',
      url: `https://glowsense.daily.co/${mockRoomName}`,
      created_at: new Date().toISOString(),
      config: {}
    };
  }

  const roomName = options.name || `glowsense-${Date.now()}`;
  
  const response = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DAILY_API_KEY}`
    },
    body: JSON.stringify({
      name: roomName,
      privacy: options.privacy || 'private',
      properties: {
        enable_chat: true,
        enable_screenshare: true,
        enable_recording: 'local',
        max_participants: 2,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
        ...options.properties
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Daily room: ${error}`);
  }

  return response.json();
}

export async function createMeetingToken(roomName: string, userName: string, isOwner: boolean = false): Promise<string> {
  if (!DAILY_API_KEY) {
    console.log('DAILY_API_KEY not set - returning mock token for development');
    return `mock-token-${Date.now()}`;
  }

  const response = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DAILY_API_KEY}`
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: userName,
        is_owner: isOwner,
        exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60)
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create meeting token: ${error}`);
  }

  const data: DailyMeetingToken = await response.json();
  return data.token;
}

export async function deleteRoom(roomName: string): Promise<void> {
  if (!DAILY_API_KEY) {
    console.log('DAILY_API_KEY not set - skipping room deletion');
    return;
  }

  const response = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${DAILY_API_KEY}`
    }
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Failed to delete Daily room: ${error}`);
  }
}

export async function getRoomDetails(roomName: string): Promise<DailyRoom | null> {
  if (!DAILY_API_KEY) {
    return null;
  }

  const response = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    headers: {
      'Authorization': `Bearer ${DAILY_API_KEY}`
    }
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to get room: ${await response.text()}`);
  }

  return response.json();
}
