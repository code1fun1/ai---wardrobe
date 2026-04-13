import axios from 'axios';
import { Clothing, Outfit, HinduDayColors } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const clothingService = {
  uploadClothing: async (file: File, category?: string, color?: string) => {
    const formData = new FormData();
    formData.append('image', file);
    if (category) formData.append('category', category);
    if (color) formData.append('color', color);

    const response = await api.post('/clothing/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getAllClothing: async (): Promise<Clothing[]> => {
    const response = await api.get('/clothing');
    return response.data;
  },

  updateClothingTags: async (id: string, manualTags: string[], category: string, color: string) => {
    const response = await api.put(`/clothing/${id}/tags`, {
      manualTags,
      category,
      color,
    });
    return response.data;
  },
};

export const outfitService = {
  getRecommendation: async (occasion?: string): Promise<Outfit> => {
    const params = occasion ? { occasion } : {};
    const response = await api.get('/outfit/recommend', { params });
    return response.data;
  },

  updateFeedback: async (id: string, liked: boolean | null, worn: boolean) => {
    const response = await api.post(`/outfit/${id}/feedback`, {
      liked,
      worn,
    });
    return response.data;
  },
};

export const colorService = {
  getHinduDayColors: async (day: string): Promise<HinduDayColors> => {
    const response = await api.get(`/colors/hindu/${day}`);
    return response.data;
  },
};
