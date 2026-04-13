import React, { useState, useEffect } from 'react';
import { clothingService } from '../services/api';
import { Clothing } from '../types';
import { Upload, X, Edit2, Save, Camera, Shirt } from 'lucide-react';

const Wardrobe: React.FC = () => {
  const [clothing, setClothing] = useState<Clothing[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    manualTags: '',
    category: '',
    color: '',
  });
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    loadClothing();
  }, []);

  const loadClothing = async () => {
    try {
      const items = await clothingService.getAllClothing();
      setClothing(items);
    } catch (error) {
      console.error('Failed to load clothing:', error);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      await clothingService.uploadClothing(selectedFile);
      setSelectedFile(null);
      loadClothing();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item: Clothing) => {
    setEditingItem(item.id);
    setEditForm({
      manualTags: item.manualTags.join(', '),
      category: item.category,
      color: item.color,
    });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const manualTags = editForm.manualTags.split(',').map(tag => tag.trim()).filter(tag => tag);
      await clothingService.updateClothingTags(id, manualTags, editForm.category, editForm.color);
      setEditingItem(null);
      loadClothing();
    } catch (error) {
      console.error('Failed to update tags:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditForm({ manualTags: '', category: '', color: '' });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Clothing Item</h2>
        
        <div
          className={`upload-area p-8 rounded-lg text-center cursor-pointer ${
            dragOver ? 'drag-over' : ''
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          
          <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            Drag and drop an image here or click to select
          </p>
          <p className="text-sm text-gray-500">Supported formats: JPG, PNG, GIF</p>
        </div>

        {selectedFile && (
          <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">
                  Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Wardrobe</h2>
        
        {clothing.length === 0 ? (
          <div className="text-center py-12">
            <Shirt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No clothing items yet. Upload your first item above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clothing.map((item) => (
              <div key={item.id} className="clothing-item bg-gray-50 rounded-lg overflow-hidden shadow-sm">
                <div className="aspect-square bg-gray-200 relative">
                  <img
                    src={`http://localhost:5000/uploads/${item.filename}`}
                    alt={item.originalName}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 capitalize">{item.category}</h3>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-1 text-gray-500 hover:text-indigo-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2 capitalize">Color: {item.color}</p>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1">AI Tags:</p>
                      <div className="flex flex-wrap gap-1">
                        {item.aiTags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {item.manualTags.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Manual Tags:</p>
                        <div className="flex flex-wrap gap-1">
                          {item.manualTags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {editingItem === item.id && (
                    <div className="mt-4 p-3 bg-white rounded-lg border">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Category
                          </label>
                          <input
                            type="text"
                            value={editForm.category}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Color
                          </label>
                          <input
                            type="text"
                            value={editForm.color}
                            onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Manual Tags (comma separated)
                          </label>
                          <input
                            type="text"
                            value={editForm.manualTags}
                            onChange={(e) => setEditForm({ ...editForm, manualTags: e.target.value })}
                            className="w-full px-2 py-1 text-sm border rounded"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="flex items-center px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wardrobe;
