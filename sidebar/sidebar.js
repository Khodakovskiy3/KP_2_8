async function createRoom() {
  try {
    console.log('Creating room...');
    const roomName = this.newRoomName || 'New Room';
    
    const response = await fetch('https://matrix.org/_matrix/client/r0/createRoom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({
        name: roomName,
        preset: 'private_chat'
      })
    });
    
    const data = await response.json();
    console.log('Create room response:', data);
    
    if (data.room_id) {
      this.newRoomId = data.room_id;
      this.roomId = data.room_id;
      this.newRoomName = '';
      this.messages = [];
      this.lastSyncToken = '';
      alert(`Room created: ${data.room_id}`);
      await this.fetchRoomsWithNames();
      this.fetchMessages();
      this.fetchRoomMembers();
    } else {
      alert('Failed to create room: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error creating room:', error);
    alert('Error creating room: ' + error.message);
  }
}

async function fetchRoomsWithNames() {
  if (!this.accessToken) return;
  try {
    const res = await fetch('https://matrix.org/_matrix/client/r0/joined_rooms', {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    const data = await res.json();
    if (data.joined_rooms) {
      const roomPromises = data.joined_rooms.map(async (roomId) => {
        try {
          const nameRes = await fetch(`https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/state/m.room.name`, {
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
          });
          if (nameRes.ok) {
            const nameData = await nameRes.json();
            return {
              roomId,
              name: nameData?.name || roomId
            };
          }
        } catch (e) {
          console.warn(`Could not fetch name for room ${roomId}:`, e);
        }
        return {
          roomId,
          name: roomId
        };
      });
      this.rooms = (await Promise.all(roomPromises))
        .sort((a, b) => a.roomId.localeCompare(b.roomId));
      if (this.rooms.length > 0 && !this.roomId) {
        this.roomId = this.rooms[0].roomId;
        this.fetchMessages();
        this.fetchRoomMembers();
      }
    }
  } catch (e) {
    console.error('Fetch rooms error:', e);
  }
}

function getRoomName(roomId) {
  return this.rooms.find(r => r.roomId === roomId)?.name || roomId;
}

function switchRoom(roomId) {
  if (roomId) this.roomId = roomId;
  this.messages = [];
  this.lastSyncToken = '';
  this.fetchMessages();
  this.fetchRoomMembers();
}

async function inviteUserToRoom() {
  if (!this.inviteUser.trim() || !this.roomId) {
    console.warn('No inviteUser or roomId');
    return;
  }
  try {
    const res = await fetch(`https://matrix.org/_matrix/client/r0/rooms/${this.roomId}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({ user_id: this.inviteUser.trim() })
    });
    const data = await res.json();
    if (data.errcode) {
      console.error('Invite failed:', data);
      alert('Invite failed: ' + (data.error || 'Unknown error'));
    } else {
      alert(`User ${this.inviteUser} invited to room successfully!`);
      this.inviteUser = '';
    }
  } catch (e) {
    console.error('Invite error:', e);
    alert('Invite error: ' + e.message);
  }
}

async function joinRoom() {
  if (!this.joinRoomId.trim()) return;
  try {
    const res = await fetch(`https://matrix.org/_matrix/client/r0/join/${encodeURIComponent(this.joinRoomId.trim())}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
    const data = await res.json();
    if (data.room_id) {
      this.roomId = data.room_id;
      this.joinRoomId = '';
      this.messages = [];
      this.lastSyncToken = '';
      await this.fetchRoomsWithNames();
      this.fetchMessages();
      this.fetchRoomMembers();
      alert('Successfully joined the room!');
    } else {
      console.error('Join failed:', data);
      alert('Join failed: ' + (data.error || 'Unknown error'));
    }
  } catch (e) {
    console.error('Join room error:', e);
    alert('Join room error: ' + e.message);
  }
}
