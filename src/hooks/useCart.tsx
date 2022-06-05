import { AxiosResponse } from "axios";
import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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

  const addProduct = async (productId: number) => {
    try {
      // Busca produto no carrinho
      let index = cart.findIndex((p: Product) => p.id === productId);

      if (index > -1) {
        updateProductAmount({ productId, amount: cart[index].amount + 1 });
      } else {
        let product: Product = (await api.get(`products/${productId}`)).data;
        index =
          cart.push({
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.image,
            amount: 1,
          }) - 1;
        setCart([...cart]);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find((p: Product) => p.id === productId);
      if (product === undefined) {
        throw "Not found";
      }
      const tempCart = cart.filter((p: Product) => p.id !== product.id);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(tempCart));
      setCart([...tempCart]);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      let index = cart.findIndex((p: Product) => p.id === productId);

      // Verifica se existe a quantidade em estoque
      const response: AxiosResponse<Stock> = await api.get(
        `stock/${productId}`
      );

      const stock = response.data;
      if (stock.amount >= amount) {
        cart[index].amount = amount;
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
        setCart([...cart]);
      } else {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
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
