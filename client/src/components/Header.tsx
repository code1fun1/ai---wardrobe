import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shirt, Home, Sparkles } from 'lucide-react';

const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white shadow-md border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <Shirt className="h-8 w-8 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">AI Wardrobe Manager</h1>
          </div>
          
          <nav className="flex space-x-1">
            <Link
              to="/wardrobe"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isActive('/wardrobe') || isActive('/')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Wardrobe</span>
            </Link>
            
            <Link
              to="/outfit"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isActive('/outfit')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Outfit Recommendation</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
