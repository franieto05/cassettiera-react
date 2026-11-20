import { useState } from "react";
import MonsterDrawer from "./components/MonsterDrawer";
import { CASSETTI } from "./components/monsters";

export default function App() {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="md-column">
      {CASSETTI.map((m) => (
        <MonsterDrawer
          key={m.id}
          monster={m}
          open={openId === m.id}
          onToggle={() => setOpenId(openId === m.id ? null : m.id)}
        />
      ))}
    </div>
  );
}