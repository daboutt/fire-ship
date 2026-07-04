export default function useRoomCode() {
  const getRoomCode = () => {
    return new URLSearchParams(window.location.search)?.get("room") || "";
  };

  const setRoomCode = (code: string) => {
    const params = new URLSearchParams(window.location.search);
    if (code) {
      params.set("room", code);
      window.history.replaceState({}, "", `?${params}`);
    } else {
      params.delete("room");
      window.history.replaceState({}, "", `?${params}`);
    }
  };

  return {
    roomCode: getRoomCode(),
    setRoomCode,
  };
}
