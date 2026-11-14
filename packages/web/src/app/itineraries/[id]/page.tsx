'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tripPlannerApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface ExperienceRec {
  experienceId: string;
  suggestedDate?: string;
  reasoning: string;
  experience?: {
    title: string;
    price: { amount: number; currency: string };
    duration: number;
    location: { address: string; latitude?: number; longitude?: number };
  };
}

interface Itinerary {
  id: string;
  experiences: ExperienceRec[];
  totalCost: { amount: number; currency: string };
  parameters: { duration?: number; preferences: string[] };
  generatedAt: string;
  shareToken?: string;
  notes?: string;
}

export default function ItineraryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareLink, setShareLink] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    tripPlannerApi
      .getItinerary(id)
      .then(({ data }) => setItinerary(data))
      .catch(() => router.push('/trip-planner'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const response = await tripPlannerApi.exportPdf(id);
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `itinerary-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateShareLink = async () => {
    try {
      const { data } = await tripPlannerApi.shareLink(id);
      const link = `${window.location.origin}/itineraries/shared/${data.shareToken}`;
      setShareLink(link);
    } catch {
      // ignore
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSendEmail = async () => {
    if (!shareEmail.trim()) return;
    try {
      await tripPlannerApi.sendEmail(id, shareEmail);
      setEmailSent(true);
      setShareEmail('');
      setTimeout(() => setEmailSent(false), 3000);
    } catch {
      // ignore
    }
  };

  const handleSaveNote = async () => {
    if (!note.trim()) return;
    try {
      await tripPlannerApi.addNote(id, note);
      setItinerary((prev) => prev ? { ...prev, notes: note } : prev);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-ink-muted">Loading itinerary...</div>
      </div>
    );
  }

  if (!itinerary) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">Your Itinerary</h1>
            <p className="text-sm text-ink-muted mt-1">
              Generated {new Date(itinerary.generatedAt).toLocaleDateString()}
              {itinerary.parameters.duration && ` · ${itinerary.parameters.duration} days`}
            </p>
          </div>
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:opacity-50 text-sm font-medium"
          >
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>

        {/* Total Cost */}
        <div className="bg-forest-50 border border-forest-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-forest-700 font-medium">Total Estimated Cost</div>
          <div className="text-2xl font-bold text-forest-900">
            {itinerary.totalCost.currency} {itinerary.totalCost.amount?.toLocaleString()}
          </div>
          {itinerary.parameters.preferences?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {itinerary.parameters.preferences.map((p) => (
                <span key={p} className="px-2 py-0.5 bg-forest-100 text-forest-700 text-xs rounded-full">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Experiences */}
        <div className="space-y-3 mb-6">
          {itinerary.experiences.map((exp, idx) => (
            <div key={exp.experienceId} className="bg-paper rounded-lg border border-[#E0E0E5] p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-forest-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-ink">
                    {exp.experience?.title || `Experience ${idx + 1}`}
                  </div>
                  {exp.suggestedDate && (
                    <div className="text-sm text-ink-muted mt-0.5">
                      {new Date(exp.suggestedDate).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })}
                    </div>
                  )}
                  {exp.experience && (
                    <div className="flex items-center gap-3 text-sm text-ink-muted mt-1">
                      <span>{exp.experience.duration}h</span>
                      <span>·</span>
                      <span>
                        {exp.experience.price.currency} {exp.experience.price.amount}
                      </span>
                      {exp.experience.location?.address && (
                        <>
                          <span>·</span>
                          <span>{exp.experience.location.address}</span>
                        </>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-ink-muted mt-1 italic">{exp.reasoning}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        {user && (
          <div className="bg-paper rounded-lg border border-[#E0E0E5] p-4 mb-6">
            <h3 className="font-semibold text-ink mb-2">Personal Notes</h3>
            {itinerary.notes && (
              <p className="text-sm text-ink-muted mb-2 p-2 bg-canvas rounded">{itinerary.notes}</p>
            )}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note to this itinerary..."
              rows={3}
              className="w-full border border-[#E0E0E5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={handleSaveNote}
                className="px-4 py-1.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900"
              >
                Save Note
              </button>
              {noteSaved && <span className="text-sm text-forest-600">Saved!</span>}
            </div>
          </div>
        )}

        {/* Share Section */}
        {user && (
          <div className="bg-paper rounded-lg border border-[#E0E0E5] p-4">
            <h3 className="font-semibold text-ink mb-3">Share Itinerary</h3>

            {/* Generate Link */}
            <div className="mb-4">
              <button
                onClick={handleGenerateShareLink}
                className="px-4 py-2 bg-gray-100 text-ink/80 text-sm rounded-lg hover:bg-gray-200 font-medium"
              >
                Generate Share Link
              </button>
              {shareLink && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    readOnly
                    value={shareLink}
                    className="flex-1 border border-[#E0E0E5] rounded px-3 py-1.5 text-sm bg-canvas"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-forest-600 text-white text-sm rounded-lg hover:bg-forest-700"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>

            {/* Email Share */}
            <div>
              <div className="text-sm text-ink-muted mb-1">Share via email</div>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1 border border-[#E0E0E5] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                />
                <button
                  onClick={handleSendEmail}
                  className="px-4 py-1.5 bg-forest-600 text-white text-sm rounded-lg hover:bg-forest-700"
                >
                  Send
                </button>
              </div>
              {emailSent && <p className="text-sm text-forest-600 mt-1">Email sent!</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
