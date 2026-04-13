from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import json
import random
import requests
import base64

load_dotenv()

app = Flask(__name__)
CORS(app)

# Direct Groq API client (without the problematic library)
class DirectGroqClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://api.groq.com/openai/v1"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def chat_completion(self, model, messages, max_tokens=1000, temperature=0.1):
        """Direct API call to Groq"""
        try:
            data = {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature
            }
            
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=data,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Groq API Error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Groq API Exception: {e}")
            return None

# Initialize direct Groq client
groq_client = DirectGroqClient(os.getenv("GROQ_API_KEY"))

class AIWardrobeService:
    def __init__(self):
        self.clothing_categories = [
            "shirt", "t-shirt", "blouse", "sweater", "hoodie", "jacket", "coat",
            "jeans", "trousers", "pants", "shorts", "skirt", "dress",
            "saree", "kurta", "sherwani", "lehenga", "salwar", "kameez"
        ]
        
        self.colors = [
            "red", "blue", "green", "yellow", "black", "white", "gray", "brown",
            "pink", "purple", "orange", "cream", "maroon", "navy", "beige"
        ]
        
        self.styles = [
            "casual", "formal", "professional", "festive", "traditional", "modern",
            "sporty", "elegant", "bohemian", "vintage", "minimalist"
        ]
        
        self.materials = [
            "cotton", "silk", "wool", "polyester", "linen", "denim", "leather",
            "velvet", "satin", "chiffon", "georgette", "khadi"
        ]

    def analyze_image_with_groq(self, image_data: bytes):
        """Analyze clothing image using Groq's vision model"""
        
        # Convert image to base64
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        prompt = f"""
        Analyze this clothing item and provide detailed information. Respond in JSON format with the following structure:
        {{
            "category": "main clothing type (must be one of: {', '.join(self.clothing_categories)})",
            "color": "primary color (must be one of: {', '.join(self.colors)})",
            "secondary_colors": ["list of other visible colors"],
            "style": "style type (must be one of: {', '.join(self.styles)})",
            "material": "likely material (must be one of: {', '.join(self.materials)})",
            "pattern": "pattern type (solid, striped, checked, floral, geometric, etc.)",
            "occasion": ["suitable occasions from: casual, professional, festive, outing, traditional"],
            "season": ["suitable seasons: summer, winter, spring, monsoon"],
            "tags": ["descriptive tags for the item"],
            "confidence": "confidence level (high/medium/low)"
        }}
        
        Be specific and accurate. If you're uncertain about any aspect, indicate low confidence.
        """
        
        try:
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ]
            
            response = groq_client.chat_completion(
                model="llava-v1.5-7b-4096-preview",
                messages=messages,
                max_tokens=1000,
                temperature=0.1
            )
            
            if response and 'choices' in response:
                content = response['choices'][0]['message']['content']
                # Extract JSON from the response
                start_idx = content.find('{')
                end_idx = content.rfind('}') + 1
                json_str = content[start_idx:end_idx]
                
                result = json.loads(json_str)
                return self.validate_ai_response(result)
            
        except Exception as e:
            print(f"Error analyzing image with Groq: {e}")
        
        # Fallback to mock response
        return self.get_fallback_analysis()

    def validate_ai_response(self, response):
        """Validate and clean AI response"""
        
        # Ensure category is valid
        if response.get("category") not in self.clothing_categories:
            response["category"] = "unknown"
        
        # Ensure color is valid
        if response.get("color") not in self.colors:
            response["color"] = "unknown"
        
        # Ensure style is valid
        if response.get("style") not in self.styles:
            response["style"] = "casual"
        
        # Ensure material is valid
        if response.get("material") not in self.materials:
            response["material"] = "unknown"
        
        # Ensure we have tags
        if not response.get("tags"):
            response["tags"] = [response.get("category", "clothing")]
        
        return response

    def get_fallback_analysis(self):
        """Fallback analysis when AI fails"""
        return {
            "category": "unknown",
            "color": "unknown",
            "secondary_colors": [],
            "style": "casual",
            "material": "unknown",
            "pattern": "solid",
            "occasion": ["casual"],
            "season": ["all"],
            "tags": ["clothing"],
            "confidence": "low"
        }

    def generate_outfit_recommendation(self, clothing_items, occasion="casual", preferences=None):
        """Generate outfit recommendation using Groq"""
        
        # Filter items by occasion
        suitable_items = [
            item for item in clothing_items 
            if occasion.lower() in [o.lower() for o in item.get("occasion", ["casual"])]
        ]
        
        if not suitable_items:
            suitable_items = clothing_items
        
        # Group by category
        shirts = [item for item in suitable_items if item.get("category") in ["shirt", "t-shirt", "blouse", "kurta"]]
        bottoms = [item for item in suitable_items if item.get("category") in ["jeans", "trousers", "pants", "shorts"]]
        outerwear = [item for item in suitable_items if item.get("category") in ["jacket", "coat", "sweater", "hoodie"]]
        
        prompt = f"""
        Based on the available clothing items, suggest a perfect outfit for a {occasion} occasion.
        
        Available items:
        Tops: {len(shirts)} items
        Bottoms: {len(bottoms)} items
        Outerwear: {len(outerwear)} items
        
        User preferences: {preferences or 'None'}
        
        Provide a recommendation in JSON format:
        {{
            "recommendation": "brief description of the outfit",
            "reasoning": "why this combination works",
            "color_harmony": "explain the color coordination",
            "style_notes": "styling tips",
            "confidence": "high/medium/low"
        }}
        
        Consider color coordination, style appropriateness, and user preferences.
        """
        
        try:
            messages = [
                {"role": "system", "content": "You are a professional fashion stylist and wardrobe consultant."},
                {"role": "user", "content": prompt}
            ]
            
            response = groq_client.chat_completion(
                model="llama-3.1-8b-instant",
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            
            if response and 'choices' in response:
                content = response['choices'][0]['message']['content']
                start_idx = content.find('{')
                end_idx = content.rfind('}') + 1
                json_str = content[start_idx:end_idx]
                
                return json.loads(json_str)
            
        except Exception as e:
            print(f"Error generating outfit recommendation: {e}")
        
        # Fallback response
        return {
            "recommendation": "A versatile casual outfit",
            "reasoning": "Classic combination suitable for the occasion",
            "color_harmony": "Well-coordinated neutral colors",
            "style_notes": "Keep it simple and comfortable",
            "confidence": "low"
        }

    def get_style_advice(self, outfit, occasion):
        """Get personalized style advice using Groq"""
        
        prompt = f"""
        Provide style advice for this outfit:
        
        Outfit: {outfit}
        Occasion: {occasion}
        
        Give advice in JSON format:
        {{
            "accessories": ["recommended accessories"],
            "footwear": ["suitable footwear options"],
            "styling_tips": ["how to wear it better"],
            "alternatives": ["alternative combinations"],
            "do_and_dont": ["do's and don'ts for this look"]
        }}
        """
        
        try:
            messages = [
                {"role": "system", "content": "You are an expert fashion stylist providing practical advice."},
                {"role": "user", "content": prompt}
            ]
            
            response = groq_client.chat_completion(
                model="llama-3.1-8b-instant",
                messages=messages,
                max_tokens=400,
                temperature=0.6
            )
            
            if response and 'choices' in response:
                content = response['choices'][0]['message']['content']
                start_idx = content.find('{')
                end_idx = content.rfind('}') + 1
                json_str = content[start_idx:end_idx]
                
                return json.loads(json_str)
            
        except Exception as e:
            print(f"Error getting style advice: {e}")
        
        # Fallback advice
        return {
            "accessories": ["Watch", "Belt"],
            "footwear": ["Casual shoes"],
            "styling_tips": ["Keep it neat and tidy"],
            "alternatives": ["Try different combinations"],
            "do_and_dont": ["Do: Be confident", "Don't: Overdo it"]
        }

# Initialize AI service
ai_service = AIWardrobeService()

@app.route('/api/ai/analyze-clothing', methods=['POST'])
def analyze_clothing():
    """Analyze clothing image using AI"""
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No image selected"}), 400
        
        # Read image
        image_bytes = file.read()
        
        # Analyze with AI
        analysis = ai_service.analyze_image_with_groq(image_bytes)
        
        return jsonify({
            "success": True,
            "analysis": analysis
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/recommend-outfit', methods=['POST'])
def recommend_outfit():
    """Generate outfit recommendation using AI"""
    try:
        data = request.get_json()
        clothing_items = data.get('clothing_items', [])
        occasion = data.get('occasion', 'casual')
        preferences = data.get('preferences', {})
        
        recommendation = ai_service.generate_outfit_recommendation(
            clothing_items, occasion, preferences
        )
        
        return jsonify({
            "success": True,
            "recommendation": recommendation
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/style-advice', methods=['POST'])
def get_style_advice():
    """Get personalized style advice"""
    try:
        data = request.get_json()
        outfit = data.get('outfit', {})
        occasion = data.get('occasion', 'casual')
        
        advice = ai_service.get_style_advice(outfit, occasion)
        
        return jsonify({
            "success": True,
            "advice": advice
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/ai/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "AI Wardrobe Service (Direct API)",
        "models": ["llava-v1.5-7b", "llama-3.1-8b-instant"],
        "note": "Using direct Groq API calls without problematic library"
    })

if __name__ == '__main__':
    print("🚀 Starting AI Wardrobe Service (Direct Groq API)")
    print("📍 Running on http://127.0.0.1:5001")
    print("🤖 Using direct Groq API calls (no library issues)")
    print("✅ This should work without dependency conflicts!")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
