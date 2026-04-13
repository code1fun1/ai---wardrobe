import React, { useState, useEffect } from 'react';
import { outfitService, colorService } from '../services/api';
import { Outfit, HinduDayColors } from '../types';
import { Sparkles, Heart, X, RefreshCw, Calendar, Filter } from 'lucide-react';

const OutfitRecommendation: React.FC = () => {
  const [currentOutfit, setCurrentOutfit] = useState<Outfit | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState<string>('casual');
  const [hinduColors, setHinduColors] = useState<HinduDayColors | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const occasions = [
    { value: 'casual', label: 'Casual' },
    { value: 'professional', label: 'Professional' },
    { value: 'festive', label: 'Festive' },
    { value: 'outing', label: 'Outing' },
  ];

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[new Date().getDay()];

  useEffect(() => {
    generateRecommendation();
    loadHinduColors();
  }, []);

  useEffect(() => {
    generateRecommendation();
  }, [selectedOccasion]);

  const loadHinduColors = async () => {
    try {
      const colors = await colorService.getHinduDayColors(currentDay);
      setHinduColors(colors);
    } catch (error) {
      console.error('Failed to load Hindu colors:', error);
    }
  };

  const generateRecommendation = async () => {
    setLoading(true);
    try {
      const outfit = await outfitService.getRecommendation(selectedOccasion);
      setCurrentOutfit(outfit);
    } catch (error) {
      console.error('Failed to generate recommendation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (liked: boolean) => {
    if (!currentOutfit) return;

    try {
      await outfitService.updateFeedback(currentOutfit.id, liked, false);
      setCurrentOutfit({
        ...currentOutfit,
        userFeedback: { ...currentOutfit.userFeedback, liked }
      });
    } catch (error) {
      console.error('Failed to update feedback:', error);
    }
  };

  const markAsWorn = async () => {
    if (!currentOutfit) return;

    try {
      await outfitService.updateFeedback(currentOutfit.id, currentOutfit.userFeedback.liked, true);
      setCurrentOutfit({
        ...currentOutfit,
        userFeedback: { ...currentOutfit.userFeedback, worn: true }
      });
      // Generate new recommendation after marking as worn
      setTimeout(generateRecommendation, 1000);
    } catch (error) {
      console.error('Failed to mark as worn:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Today's Outfit Recommendation</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Occasion
                </label>
                <select
                  value={selectedOccasion}
                  onChange={(e) => setSelectedOccasion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {occasions.map((occasion) => (
                    <option key={occasion.value} value={occasion.value}>
                      {occasion.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {hinduColors && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    {currentDay.charAt(0).toUpperCase() + currentDay.slice(1)} Colors (Hindu Tradition)
                  </label>
                  <div className="flex space-x-2">
                    {hinduColors.colors.map((color, index) => (
                      <div
                        key={index}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm capitalize"
                      >
                        {color}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Generating your perfect outfit...</p>
          </div>
        ) : currentOutfit ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentOutfit.items.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg overflow-hidden shadow-sm">
                  <div className="aspect-square bg-gray-200">
                    <img
                      src={`http://localhost:5000/uploads/${item.filename}`}
                      alt={item.originalName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 capitalize mb-1">{item.category}</h3>
                    <p className="text-sm text-gray-600 capitalize">Color: {item.color}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.aiTags.slice(0, 3).map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">
                  Occasion: <span className="capitalize">{selectedOccasion}</span>
                </span>
                <span className="text-sm text-gray-500">
                  Recommended: {new Date(currentOutfit.dateRecommended).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleFeedback(true)}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                    currentOutfit.userFeedback.liked === true
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                  }`}
                >
                  <Heart className="h-4 w-4" fill={currentOutfit.userFeedback.liked === true ? 'currentColor' : 'none'} />
                  <span>Like</span>
                </button>

                <button
                  onClick={() => handleFeedback(false)}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                    currentOutfit.userFeedback.liked === false
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700'
                  }`}
                >
                  <X className="h-4 w-4" />
                  <span>Dislike</span>
                </button>

                {!currentOutfit.userFeedback.worn && (
                  <button
                    onClick={markAsWorn}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Mark as Worn
                  </button>
                )}

                <button
                  onClick={generateRecommendation}
                  className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>New Recommendation</span>
                </button>
              </div>
            </div>

            {currentOutfit.userFeedback.worn && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 font-medium">✓ This outfit has been marked as worn</p>
                <p className="text-sm text-green-600 mt-1">
                  It won't be recommended again this week to ensure variety in your wardrobe.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No outfit recommendation available</p>
            <button
              onClick={generateRecommendation}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Generate Recommendation
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">1</div>
            <p>AI analyzes your wardrobe and creates outfit combinations based on occasion, color harmony, and your preferences.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">2</div>
            <p>Weekly uniqueness ensures you get variety - outfits won't be repeated within the same week.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">3</div>
            <p>Your feedback helps personalize future recommendations. Like or dislike outfits to teach the AI your style preferences.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">4</div>
            <p>Hindu tradition color suggestions help you choose auspicious colors based on the day of the week.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutfitRecommendation;
