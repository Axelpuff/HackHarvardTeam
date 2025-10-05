'use client';

import { Proposal, ChangeItem } from '@/lib/models/proposal';

interface ProposalPanelProps {
  proposal: Proposal | null;
  isLoading?: boolean;
  onAcceptChange?: (changeId: string) => void;
  onRejectChange?: (changeId: string) => void;
  onApplyProposal?: () => void;
  onUndoProposal?: () => void;
  canApply?: boolean;
  canUndo?: boolean;
}

export function ProposalPanel({
  proposal,
  isLoading = false,
  onAcceptChange,
  onRejectChange,
  onApplyProposal,
  onUndoProposal,
  canApply = false,
  canUndo = false,
}: ProposalPanelProps) {
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'add':
        return 'bg-green-100 border-green-300';
      case 'move':
        return 'bg-blue-100 border-blue-300';
      case 'remove':
        return 'bg-red-100 border-red-300';
      case 'adjust':
        return 'bg-yellow-100 border-yellow-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'add':
        return '➕';
      case 'move':
        return '🔄';
      case 'remove':
        return '➖';
      case 'adjust':
        return '⚙️';
      default:
        return '';
    }
  };

  const getSleepAssessmentColor = (belowTarget: boolean) => {
    return belowTarget ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50';
  };

  const acceptedCount =
    proposal?.changes.filter((c) => c.accepted === 'accepted').length || 0;
  const rejectedCount =
    proposal?.changes.filter((c) => c.accepted === 'rejected').length || 0;
  const pendingCount =
    proposal?.changes.filter((c) => c.accepted === 'pending').length || 0;

  if (isLoading) {
    return (
      <div className="rounded-lg shadow-sm h-96 backdrop-blur-md bg-white/5 dark:bg-white/5">
        <div className="p-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Proposed Changes
          </h2>
        </div>
        <div className="p-4 flex items-center justify-center h-80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500 dark:text-gray-400">
              Generating proposal...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg shadow-sm h-96 backdrop-blur-md bg-white/5 dark:bg-white/5">
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Proposed Changes
            </h2>
            {proposal && (
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Revision {proposal.revision} • {proposal.changes.length} changes
              </div>
            )}
          </div>
          {proposal && (
            <div className="text-right text-xs text-gray-500 dark:text-gray-400">
              <div>✅ {acceptedCount} accepted</div>
              <div>❌ {rejectedCount} rejected</div>
              <div>⏳ {pendingCount} pending</div>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-y-auto h-64">
        {!proposal ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 mt-8">
            <p>No proposal yet</p>
            <p className="text-sm mt-2">
              Start a conversation to generate scheduling suggestions
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <h3 className="font-medium text-blue-900 text-sm mb-1">
                Summary
              </h3>
              <p className="text-sm text-blue-800">{proposal.summary}</p>
            </div>

            {/* Sleep Assessment */}
            <div
              className={`border rounded-md p-3 ${getSleepAssessmentColor(
                proposal.sleepAssessment.belowTarget
              )}`}
            >
              <h3 className="font-medium text-sm mb-1">Sleep Assessment</h3>
              <p className="text-sm">
                Estimated:{' '}
                {proposal.sleepAssessment.estimatedSleepHours.toFixed(1)} hours
                {proposal.sleepAssessment.belowTarget && ' ⚠️ Below target'}
              </p>
            </div>

            {/* Changes */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                Changes
              </h3>
              {proposal.changes.map((change) => (
                <div
                  key={change.id}
                  className={`border rounded-md p-3 ${getChangeTypeColor(change.type)} ${
                    change.accepted === 'rejected' ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">
                        {getChangeTypeIcon(change.type)}
                      </span>
                      <span className="font-medium text-sm">
                        {change.type.toUpperCase()}: {change.event.title}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onAcceptChange?.(change.id)}
                        disabled={change.accepted === 'accepted'}
                        className={`w-6 h-6 rounded text-xs ${
                          change.accepted === 'accepted'
                            ? 'bg-green-600 text-white'
                            : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'
                        }`}
                        title="Accept change"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => onRejectChange?.(change.id)}
                        disabled={change.accepted === 'rejected'}
                        className={`w-6 h-6 rounded text-xs ${
                          change.accepted === 'rejected'
                            ? 'bg-red-600 text-white'
                            : 'bg-white border border-red-600 text-red-600 hover:bg-red-50'
                        }`}
                        title="Reject change"
                      >
                        ✗
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                    {formatTime(change.event.start)} -{' '}
                    {formatTime(change.event.end)} (
                    {formatDuration(change.event.durationMinutes)})
                  </div>

                  <p className="text-xs text-gray-700 dark:text-gray-200">
                    {change.rationale}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {proposal && (
        <div className="p-4 bg-gray-50/60 dark:bg-gray-800/40 flex justify-between rounded-b-lg backdrop-blur-sm">
          <button
            onClick={onUndoProposal}
            disabled={!canUndo}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Undo Last Apply
          </button>
          <button
            onClick={onApplyProposal}
            disabled={!canApply || acceptedCount === 0}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Apply Changes ({acceptedCount})
          </button>
        </div>
      )}
    </div>
  );
}
