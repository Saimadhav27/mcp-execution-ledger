'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface LatestSession {
  sessionId: string;
  startedAt: string;
  executionCount: number;
}

interface Statistics {
  totalSessions: number;
  totalExecutions: number;
  totalCheckpoints: number;
  successRate: number;
  failureRate: number;
  latestSession: LatestSession | null;
}

interface RecentSession {
  sessionId: string;
  startedAt: string;
  executionCount: number;
  checkpointCount: number;
}

interface RecentExecution {
  executionId: string;
  timestamp: string;
  toolName: string;
  status: 'success' | 'failed';
}

interface DashboardData {
  statistics: Statistics;
  recentSessions: RecentSession[];
  recentExecutions: RecentExecution[];
}

export default function LedgerDashboard() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();

  const isDark = theme === 'dark';
  const bg = isDark ? '#0f1117' : '#f7f8fa';
  const cardBg = isDark ? '#1a1d27' : '#ffffff';
  const border = isDark ? '#2a2e3a' : '#e6e8ee';
  const text = isDark ? '#f1f3f9' : '#12141c';
  const muted = isDark ? '#9aa2b1' : '#697080';

  const formatTime = (iso: string): string => {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString();
  };

  if (!isReady) {
    return (
      <div style={{ padding: 24, color: muted, fontFamily: 'system-ui, sans-serif' }}>
        Initializing…
      </div>
    );
  }

  const data = getToolOutput<DashboardData>();
  if (!data) {
    return (
      <div style={{ padding: 24, color: muted, fontFamily: 'system-ui, sans-serif' }}>
        Loading ledger…
      </div>
    );
  }

  const stats: Statistics = data.statistics ?? {
    totalSessions: 0,
    totalExecutions: 0,
    totalCheckpoints: 0,
    successRate: 0,
    failureRate: 0,
    latestSession: null
  };

  const recentSessions = data.recentSessions ?? [];
  const recentExecutions = data.recentExecutions ?? [];

  const totalSessions = stats.totalSessions ?? 0;
  const totalExecutions = stats.totalExecutions ?? 0;
  const totalCheckpoints = stats.totalCheckpoints ?? 0;
  const successRate = stats.successRate ?? 0;
  const failureRate = stats.failureRate ?? 0;

  const metricCards = [
    { label: 'Sessions', value: String(totalSessions), accent: '#6366f1' },
    { label: 'Executions', value: String(totalExecutions), accent: '#0ea5e9' },
    { label: 'Checkpoints', value: String(totalCheckpoints), accent: '#f59e0b' },
    { label: 'Success rate', value: `${successRate}%`, accent: '#10b981' }
  ];

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: muted,
    marginBottom: 8
  };

  const emptyRowStyle: React.CSSProperties = {
    background: cardBg,
    border: `1px dashed ${border}`,
    borderRadius: 10,
    padding: '14px 12px',
    fontSize: 12,
    color: muted,
    textAlign: 'center',
    marginBottom: 18
  };

  return (
    <div
      style={{
        padding: 20,
        background: bg,
        color: text,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        borderRadius: 16,
        maxWidth: 640
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18
          }}
        >
          📒
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Execution Ledger</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: muted }}>
            Durable session &amp; execution overview
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 18
        }}
      >
        {metricCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: cardBg,
              border: `1px solid ${border}`,
              borderRadius: 12,
              padding: '12px 10px',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: card.accent }}>{card.value}</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          height: 8,
          borderRadius: 999,
          overflow: 'hidden',
          background: border,
          marginBottom: 20
        }}
      >
        <div style={{ width: `${Math.max(0, Math.min(100, successRate))}%`, background: '#10b981' }} />
        <div style={{ width: `${Math.max(0, Math.min(100, failureRate))}%`, background: '#ef4444' }} />
      </div>

      <div style={sectionTitleStyle}>Recent Sessions</div>
      {recentSessions.length === 0 ? (
        <div style={emptyRowStyle}>No sessions recorded yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
          {recentSessions.map((session) => (
            <div
              key={session.sessionId}
              style={{
                background: cardBg,
                border: `1px solid ${border}`,
                borderRadius: 10,
                padding: '10px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'ui-monospace, monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {session.sessionId}
                </div>
                <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                  {formatTime(session.startedAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: muted, flexShrink: 0 }}>
                <span>
                  <strong style={{ color: text }}>{session.executionCount ?? 0}</strong> exec
                </span>
                <span>
                  <strong style={{ color: text }}>{session.checkpointCount ?? 0}</strong> cp
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={sectionTitleStyle}>Recent Executions</div>
      {recentExecutions.length === 0 ? (
        <div style={emptyRowStyle}>No executions recorded yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {recentExecutions.map((execution) => (
            <div
              key={execution.executionId}
              style={{
                background: cardBg,
                border: `1px solid ${border}`,
                borderRadius: 10,
                padding: '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: execution.status === 'success' ? '#10b981' : '#ef4444',
                    flexShrink: 0
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{execution.toolName || 'unknown'}</span>
              </div>
              <span style={{ fontSize: 11, color: muted, flexShrink: 0 }}>
                {formatTime(execution.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
