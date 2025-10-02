import React, { useEffect, useRef } from 'react';

interface LogsProps {
  logs: string[];
  t: {
    title: string;
    waiting: string;
  };
}

export const Logs: React.FC<LogsProps> = ({ logs, t }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/30 shadow-lg">
      <h2 className="text-xl font-semibold mb-4 flex items-center space-x-3">
        <span className="text-2xl">📋</span>
        <span>{t.title}</span>
      </h2>
      
      <div className="bg-black/50 rounded-xl p-4 h-64 overflow-y-auto font-mono text-sm border border-gray-600/30">
        {logs.length === 0 ? (
          <div className="text-gray-500 italic">{t.waiting}</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1 text-gray-300">
              {log}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};