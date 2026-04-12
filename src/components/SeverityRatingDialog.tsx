import React, { useState } from 'react';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';

interface Props {
  complaintId: string;
  userId: string;
  isLike: boolean;
  onRatingSubmitted: (severity: number) => void;
  onClose: () => void;
}

export default function SeverityRatingDialog({ complaintId, userId, isLike, onRatingSubmitted, onClose }: Props) {
  const [rating, setRating] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1: Mild, 2: Moderate, 3: Significant, 4: Severe, 5: Critical
  const getSeverityLabel = (val: number) => {
    switch (val) {
      case 1: return 'Mild - Minor inconvenience';
      case 2: return 'Moderate - Needs attention soon';
      case 3: return 'Significant - Causing problems';
      case 4: return 'Severe - Major issue';
      case 5: return 'Critical - Immediate danger/blockage';
      default: return '';
    }
  };

  const getSeverityColor = (val: number) => {
    switch (val) {
      case 1: return 'text-green-500 bg-green-50';
      case 2: return 'text-yellow-500 bg-yellow-50';
      case 3: return 'text-orange-500 bg-orange-50';
      case 4: return 'text-red-500 bg-red-50';
      case 5: return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Update the verification record with severity
      const { error } = await supabase
        .from('verification')
        .update({ severity: rating })
        .eq('complaint_id', complaintId)
        .eq('user_id', userId)
        .eq('verified_true', true);

      if (error) throw error;
      
      onRatingSubmitted(rating);
      toast.success('Severity rating submitted!');
      onClose();
    } catch (err: any) {
      toast.error('Failed to submit rating: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLike) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
          <p className="text-gray-800 text-center mb-4">Please like the complaint first to rate severity</p>
          <button onClick={onClose} className="w-full py-2 bg-gray-200 rounded-lg text-gray-800 font-medium">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative animate-in fade-in zoom-in duration-200">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Rate Severity</h3>
        <p className="text-gray-500 text-sm mb-6">How severe is this issue in your opinion?</p>

        <div className="space-y-3 mb-8">
          {[1,2,3,4,5].map(val => (
            <button
              key={val}
              onClick={() => setRating(val)}
              className={`w-full py-3 px-4 rounded-xl border text-left transition-all ${
                rating === val 
                  ? `border-primary ring-2 ring-primary/20 ${getSeverityColor(val)} font-semibold shadow-sm` 
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {val} - {getSeverityLabel(val)}
            </button>
          ))}
        </div>

        <div className="flex space-x-3">
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-md transition-all flex justify-center items-center"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Submit'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
