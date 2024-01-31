import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  }, [cart]);

  const addProduct = async (productId: number) => {

    try {
      const newCart: Product[] = [...cart];
      const stockAmount = await api.get(`stock/${productId}`)
        .then(res => res.data.amount)
        .catch(() => toast.error("Erro na adição do produto"));

      if(stockAmount == 0) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if(newCart) {
        const product = newCart.filter((product) => product.id ? product.id === productId : [])[0];
        const productAmount = product ? product.amount : 0;
  
        if(productAmount >= stockAmount) {
          toast.error("Quantidade solicitada fora de estoque");
          return
        }
  
        if(product) {
          updateProductAmount({productId: productId, amount: product.amount})
          return
        }
      }

      const newProduct = await api.get(`products/${productId}`)
        .then(res => res.data)
        .catch(() => toast.error("Erro na adição do produto"));

      newProduct.amount = 1;
      setCart([...newCart, newProduct]);

    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart: Product[] = cart.filter((product) => product.id !== productId);
      setCart([...newCart]);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return
      }

      const stockAmount = await api.get(`stock/${productId}`)
        .then(res => res.data.amount)
        .catch(() => toast.error("Erro na alteração de quantidade do produto"));
      
      if(stockAmount <= amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return
      }

      const newCart: Product[] = cart.map(product => {
        if(product.id === productId) {
          product.amount = amount + 1;
          return product;
        }
        return product;
      });
      setCart([...newCart]);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
