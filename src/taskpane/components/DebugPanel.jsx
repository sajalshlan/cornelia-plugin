import React, { useEffect, useState } from 'react';

export const DebugPanel = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Monitor debug-output div for changes
    const debugDiv = document.getElementById('debug-output');
    if (debugDiv) {
      const observer = new MutationObserver((mutations) => {
        setLogs(debugDiv.innerHTML.split('</div>').filter(Boolean));
      });

      observer.observe(debugDiv, {
        childList: true,
        subtree: true,
        characterData: true
      });

      return () => observer.disconnect();
    }
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '0',
      right: '0',
      maxHeight: '200px',
      overflow: 'auto',
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      zIndex: '9999'
    }}>
      {logs.map((log, index) => (
        <div key={index} dangerouslySetInnerHTML={{ __html: log + '</div>' }} />
      ))}
    </div>
  );
};

export default DebugPanel;