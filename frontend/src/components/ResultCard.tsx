import React from 'react';
import { useTranslation } from 'react-i18next';

interface UncertaintyDetails {
  top1_conf: number;
  top2_conf: number;
  margin: number;
  entropy: number;
  uncertainty_score: number;
}

interface ResultCardProps {
  label: string;
  disease_name?: string;
  confidence: number;
  cure: string;
  tips: string;
  status?: 'certain' | 'uncertain';
  uncertainty_details?: UncertaintyDetails;
  all_predictions?: Record<string, number>;
  recommendation?: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({ 
  label, 
  disease_name, 
  confidence, 
  cure, 
  tips, 
  status = 'certain',
  uncertainty_details,
  all_predictions,
  recommendation 
}) => {
  const { t } = useTranslation();

  const displayName = disease_name || t(`diseases.${label}.name`);
  const displayCure = cure || t(`diseases.${label}.cure`);
  const displayTips = tips || t(`diseases.${label}.tips`);

  // Determine confidence color based on status and value
  const getConfidenceColor = () => {
    if (status === 'uncertain') return 'bg-yellow-500';
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-blue-500';
    return 'bg-orange-500';
  };

  const getConfidenceTextColor = () => {
    if (status === 'uncertain') return 'text-yellow-700';
    if (confidence >= 0.8) return 'text-green-700';
    if (confidence >= 0.6) return 'text-blue-700';
    return 'text-orange-700';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      {/* Uncertainty Warning */}
      {status === 'uncertain' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="text-yellow-800 font-medium">Low Confidence Prediction</h4>
              <p className="text-yellow-700 text-sm mt-1">
                {recommendation || "The AI model is uncertain about this prediction. Please consult an agricultural expert for accurate diagnosis."}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">{t('result.disease')}</h3>
          <span className={`font-medium ${getConfidenceTextColor()}`}>{displayName}</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center text-sm">
            <span>{t('result.confidence')}</span>
            <span className={getConfidenceTextColor()}>{Math.round(confidence * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getConfidenceColor()}`}
              style={{ width: `${Math.round(confidence * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* All Predictions (for uncertain cases) */}
      {status === 'uncertain' && all_predictions && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium mb-2 text-gray-700">All Predictions:</h4>
          <div className="space-y-1">
            {Object.entries(all_predictions)
              .sort(([,a], [,b]) => b - a)
              .map(([disease, prob]) => (
                <div key={disease} className="flex justify-between text-sm">
                  <span className="capitalize">{disease.replace('_', ' ')}</span>
                  <span className="font-medium">{Math.round(prob * 100)}%</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Uncertainty Details (expandable) */}
      {uncertainty_details && (
        <details className="bg-gray-50 rounded-lg p-4">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            Technical Details
          </summary>
          <div className="mt-2 space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Top Prediction Confidence:</span>
              <span>{Math.round(uncertainty_details.top1_conf * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Second Prediction:</span>
              <span>{Math.round(uncertainty_details.top2_conf * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Prediction Margin:</span>
              <span>{Math.round(uncertainty_details.margin * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Uncertainty Score:</span>
              <span>{uncertainty_details.uncertainty_score.toFixed(3)}</span>
            </div>
          </div>
        </details>
      )}

      <div>
        <h4 className="font-medium mb-2">{t('result.cure')}</h4>
        <p className="text-gray-600">{displayCure}</p>
      </div>

      <div>
        <h4 className="font-medium mb-2">{t('result.tips')}</h4>
        <p className="text-gray-600">{displayTips}</p>
      </div>

      {/* Expert Consultation CTA for uncertain predictions */}
      {status === 'uncertain' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-blue-800 font-medium">Need Expert Help?</h4>
              <p className="text-blue-700 text-sm">Get professional advice from agricultural experts</p>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Consult Expert
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
