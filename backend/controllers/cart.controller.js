import Product from "../models/product.model.js";

// urunleri cart'a almak icin
export const getCartProducts = async (req, res) => {
  try {
    const products = await Product.find({ _id: { $in: req.user.cartItems } }); // cartItems arrayindeki urunleri bulmak icin

    // ad quantity for each product
    const cartItems = products.map((product) => {
      // her bir urun icin
      const item = req.user.cartItems.find(
        (cartItem) => cartItem.id === product.id // cartItems arrayindeki urunun id'sini almak icin
      );
      return { ...product.toJSON(), quantity: item.quantity }; // urun bilgilerini donduruyoruz
    });
    res.json(cartItems); // cartItems arrayini donduruyoruz
  } catch (error) {
    console.log("Error in getCartProducts controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;

    const existingItem = user.cartItems.find((item) => item.id === productId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cartItems.push(productId);
    }

    await user.save();
    res.json(user.cartItems);
  } catch (error) {
    console.log("Error in addToCart controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// all cunku cart'taki urunun adeti mesela 4 ise hepsini kaldirmak icin
export const removeAllFromCart = async (req, res) => {
  try {
    const { productId } = req.body; // silmek istedigimiz urunun id'sini aliyoruz
    const user = req.user; // kullaniciyi aliyoruz
    if (!productId) {
      // silmek istedigimiz urunun id'si yoksa
      user.cartItems = []; // cartItems arrayini bosaltiyoruz
    } else {
      user.cartItems = user.cartItems.filter((item) => item.id !== productId); // silmek istedigimiz urunun id'sine gore cartItems arrayini filtreliyoruz
    }
    await user.save(); // degisiklikleri kaydediyoruz
    res.json(user.cartItems); // cartItems arrayini donduruyoruz
  } catch (error) {
    console.log("Error in removeAllFromCart controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// cart'taki urun adetini arttirip azaltmak icin
export const updateQuantity = async (req, res) => {
  try {
    const { id: productId } = req.params; // urunun id'sini aliyoruz
    const { quantity } = req.body; // urunun adetini aliyoruz
    const user = req.user; // kullaniciyi aliyoruz
    const existingItem = user.cartItems.find((item) => item.id === productId); // cartItems arrayindeki urunun id'sini aliyoruz

    if (existingItem) {
      // cartItems arrayindeki urun varsa
      if (quantity === 0) {
        // urunun adeti 0 ise
        user.cartItems = user.cartItems.filter((item) => item.id !== productId); // cartItems arrayini filtreliyoruz
        await user.save();
        return res.json(user.cartItems);
      }

      existingItem.quantity = quantity; // urunun adetini degistiriyoruz
      await user.save();
      res.json(user.cartItems);
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    console.log("Error in updateQuantity controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
