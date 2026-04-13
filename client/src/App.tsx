import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Wardrobe from './pages/Wardrobe';
import OutfitRecommendation from './pages/OutfitRecommendation';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Wardrobe />} />
            <Route path="/wardrobe" element={<Wardrobe />} />
            <Route path="/outfit" element={<OutfitRecommendation />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
