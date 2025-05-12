import { useState } from "react";

const sampleProducts = [
  { id: 1, name: "Plain Shirt", colors: { red: false, blue: true }, price: 25 },
  { id: 2, name: "Jeans", colors: { black: true }, price: 45 },
];

export default function ProductsPage() {
  const [cart, setCart] = useState<any[]>([]);

  const addToCart = (product: any, color: string) => {
    if (!product.colors[color]) return;
    setCart([...cart, { ...product, selectedColor: color }]);
  };

  const checkout = () => {
    alert(`Checking out ${cart.length} item(s)`);
  };

  return (
    <div className="p-4 relative">
      <h1 className="text-3xl font-bold mb-4">Products</h1>
      <div className="grid grid-cols-1 gap-4">
        {sampleProducts.map((product) => (
          <div key={product.id} className="border p-4 rounded shadow">
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p>${product.price}</p>
            <div className="flex space-x-2 mt-2">
              {Object.entries(product.colors).map(([color, inStock]) => (
                <button
                  key={color}
                  className={`px-3 py-1 rounded ${
                    inStock
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 text-gray-600 cursor-not-allowed"
                  }`}
                  onClick={() => addToCart(product, color)}
                  disabled={!inStock}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <button
          className="bg-purple-600 text-white px-6 py-2 rounded"
          onClick={checkout}
        >
          Checkout ({cart.length})
        </button>
      </div>

      {/* Voice Assistant Button */}
      <button className="fixed bottom-6 right-6 bg-black text-white p-4 rounded-full shadow-lg hover:bg-gray-800">
        🎤
      </button>
    </div>
  );
}
