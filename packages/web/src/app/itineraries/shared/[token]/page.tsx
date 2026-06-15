'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';

interface ExperienceRec {
  experienceId: string;
  suggestedDate?: string;
  reasoning: string;
  experience?: {
    title: string;
    price: { amount: number; currency: string };
    duration: number;
    location: { address: string };
  };
}

interface SharedItinerary {
  id: string;
  experiences: ExperienceRec[];
  totalCost: { amount: number; currency: string };
  parameters: { duration?: number; preferences: string[] };
  generatedAt: string;
}

export default function SharedItineraryPage() {
  const { token } = useParams<{ token: string }>();
  const [itinerary, setItinerary] = useState<SharedItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get(`/trip-planner/itineraries/shared/${token}`)
      .then(({ data }) => setItinerary(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading itinerary...</div>
      </div>
    );
  }

  if (notFound || !itinerary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-700">Itinerary not found</div>
          <p className="text-gray-500 mt-2">This link may have expired or been removed.</p>
          <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Go to homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full mb-3">
            Shared Itinerary
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Travel Itinerary</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generated {new Date(itinerary.generatedAt).toLocaleDateString()}
            {itinerary.parameters.duration && ` · ${itinerary.parameters.duration} days`}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-blue-700 font-medium">Total Estimated Cost</div>
          <div className="text-2xl font-bold text-blue-900">
            {itinerary.totalCost.currency} {itinerary.totalCost.amount?.toLocaleString()}
          </div>
          {itinerary.parameters.preferences?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {itinerary.parameters.preferences.map((p) => (
                <span
                  key={p}
                  className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 mb-8">
          {itinerary.experiences.map((exp, idx) => (
            <div key={exp.experienceId} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {exp.experience?.title || `Experience ${idx + 1}`}
                  </div>
                  {exp.suggestedDate && (
                    <div className="text-sm text-gray-500 mt-0.5">
                      {new Date(exp.suggestedDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  )}
                  {exp.experience && (
                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
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
                  <p className="text-sm text-gray-500 mt-1 italic">{exp.reasoning}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <a
            href="/trip-planner"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create Your Own Itinerary
          </a>
        </div>
      </div>
    </div>
  );
}
