import React, { useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import TaskPanel from "./components/TaskPanel.jsx";
import AutomationsPanel from "./components/AutomationsPanel.jsx";
import { fetchHealth } from "./lib/api.js";

export default function App() {
  const [online, setOnline] = useState(true);
  const [taskRefreshKey, setTaskRefreshKey] = useState(0);
  const [automationRefreshKey, setAutomationRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    fetchHealth().then((h) => {
      if (mounted) setOnline(!!h.ok);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="app-shell">
      <Header online={online} />
      <div className="main-grid">
        <ChatPanel
          onTaskMutation={() => setTaskRefreshKey((k) => k + 1)}
          onAutomationMutation={() => setAutomationRefreshKey((k) => k + 1)}
        />
        <aside className="task-sidebar">
          <TaskPanel refreshKey={taskRefreshKey} />
          <AutomationsPanel
            refreshKey={automationRefreshKey}
            onMutation={() => setAutomationRefreshKey((k) => k + 1)}
          />
        </aside>
      </div>
    </div>
  );
}
