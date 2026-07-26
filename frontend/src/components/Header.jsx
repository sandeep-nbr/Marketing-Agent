import React from "react";

export default function Header({ online }) {
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-orb" />
        <div className="brand-text">
          <h1>NBR Marketing Agent</h1>
          <span>AI Marketing Assistant</span>
        </div>
      </div>
      <div className="header-status">
        <span className={`status-dot ${online ? "" : "offline"}`} />
        {online ? "Connected" : "Backend unreachable"}
      </div>
    </header>
  );
}
