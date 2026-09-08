export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  const publicKey =
    process.env.MERCADO_PAGO_PUBLIC_KEY;

  if (!publicKey) {
    return res.status(500).json({
      error:
        "Public Key do Mercado Pago não configurada."
    });
  }

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  return res.status(200).json({
    publicKey
  });
}
