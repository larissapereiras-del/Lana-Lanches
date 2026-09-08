const SUPABASE_URL =
  "https://ifbecuswojeufycovodo.supabase.co";


function supabaseHeaders(
  secretKey,
  extra = {}
) {

  return {
    apikey:
      secretKey,

    "Content-Type":
      "application/json",

    ...extra
  };
}


async function readJsonSafely(
  response
) {

  const text =
    await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text
    };
  }
}


async function supabaseRequest(
  path,
  options = {}
) {

  const secretKey =
    process.env
      .SUPABASE_SECRET_KEY;


  if (!secretKey) {

    throw new Error(
      "SUPABASE_SECRET_KEY não configurada."
    );
  }


  const response =
    await fetch(
      `${SUPABASE_URL}/rest/v1/${path}`,
      {
        ...options,

        headers:
          supabaseHeaders(
            secretKey,
            options.headers ||
              {}
          )
      }
    );


  const data =
    await readJsonSafely(
      response
    );


  if (!response.ok) {

    console.error(
      "Erro Supabase:",
      response.status,
      data
    );


    const error =
      new Error(
        "Erro ao acessar o banco de dados."
      );


    error.status =
      response.status;


    error.details =
      data;


    throw error;
  }


  return data;
}


function normalizeCart(
  items
) {

  if (
    !Array.isArray(items)
  ) {
    return [];
  }


  const grouped =
    new Map();


  for (
    const item of items
  ) {

    const productId =
      Number(
        item?.product_id
      );


    const quantity =
      Number(
        item?.qty
      );


    if (
      !Number.isInteger(
        productId
      ) ||
      productId <= 0 ||
      !Number.isInteger(
        quantity
      ) ||
      quantity <= 0 ||
      quantity > 50
    ) {
      continue;
    }


    grouped.set(
      productId,
      (
        grouped.get(
          productId
        ) || 0
      ) +
        quantity
    );
  }


  return Array
    .from(
      grouped.entries()
    )
    .map(
      (
        [
          product_id,
          qty
        ]
      ) => ({
        product_id,
        qty
      })
    );
}


function paymentStatus(
  mercadoPagoStatus
) {

  switch (
    mercadoPagoStatus
  ) {

    case "approved":
      return "paid";

    case "rejected":
      return "rejected";

    case "cancelled":
      return "cancelled";

    case "refunded":
      return "refunded";

    case "charged_back":
      return "chargeback";

    default:
      return "pending";
  }
}


async function updateOrder(
  orderId,
  payload
) {

  return supabaseRequest(
    `orders?id=eq.${orderId}`,
    {
      method:
        "PATCH",

      headers: {
        Prefer:
          "return=minimal"
      },

      body:
        JSON.stringify(
          payload
        )
    }
  );
}


export default async function handler(
  req,
  res
) {

  if (
    req.method !==
    "POST"
  ) {

    return res
      .status(405)
      .json({
        error:
          "Método não permitido."
      });
  }


  try {

    const accessToken =
      process.env
        .MERCADO_PAGO_ACCESS_TOKEN;


    const supabaseSecret =
      process.env
        .SUPABASE_SECRET_KEY;


    if (!accessToken) {

      console.error(
        "MERCADO_PAGO_ACCESS_TOKEN não configurado."
      );


      return res
        .status(500)
        .json({
          error:
            "Configuração do Mercado Pago indisponível."
        });
    }


    if (!supabaseSecret) {

      console.error(
        "SUPABASE_SECRET_KEY não configurada."
      );


      return res
        .status(500)
        .json({
          error:
            "Configuração do banco de dados indisponível."
        });
    }


    const body =
      req.body || {};


    /*
      =======================================================
      DADOS DO CLIENTE
      =======================================================
    */

    const customerName =
      String(
        body.customer_name ||
          ""
      )
        .trim()
        .slice(
          0,
          120
        );


    const customerPhone =
      String(
        body.customer_phone ||
          ""
      )
        .trim()
        .slice(
          0,
          40
        );


    const fulfillment =
      body.fulfillment ===
        "pickup"
        ? "pickup"
        : "delivery";


    const street =
      String(
        body.street ||
          ""
      )
        .trim()
        .slice(
          0,
          200
        );


    const number =
      String(
        body.number ||
          ""
      )
        .trim()
        .slice(
          0,
          50
        );


    const complement =
      String(
        body.complement ||
          ""
      )
        .trim()
        .slice(
          0,
          300
        );


    const notes =
      String(
        body.notes ||
          ""
      )
        .trim()
        .slice(
          0,
          500
        );


    if (
      !customerName ||
      !customerPhone
    ) {

      return res
        .status(400)
        .json({
          error:
            "Informe nome e WhatsApp."
        });
    }


    if (
      fulfillment ===
        "delivery" &&
      (
        !body.neighborhood_id ||
        !street ||
        !number
      )
    ) {

      return res
        .status(400)
        .json({
          error:
            "Informe bairro, rua e número."
        });
    }


    /*
      =======================================================
      CARRINHO
      =======================================================
    */

    const requestedItems =
      normalizeCart(
        body.items
      );


    if (
      !requestedItems.length
    ) {

      return res
        .status(400)
        .json({
          error:
            "O carrinho está vazio."
        });
    }


    /*
      =======================================================
      VALIDA STATUS DA LOJA
      =======================================================
    */

    const storeRows =
      await supabaseRequest(
        "store_settings?id=eq.1&select=id,status",
        {
          method:
            "GET"
        }
      );


    const store =
      Array.isArray(
        storeRows
      )
        ? storeRows[0]
        : null;


    if (
      !store ||
      store.status !==
        "open"
    ) {

      return res
        .status(409)
        .json({
          error:
            "A loja não está recebendo pedidos agora."
        });
    }


    /*
      =======================================================
      BUSCA PRODUTOS ATIVOS
      =======================================================
    */

    const products =
      await supabaseRequest(
        "products?active=eq.true&select=id,name,price,active",
        {
          method:
            "GET"
        }
      );


    const productMap =
      new Map(
        (
          products ||
          []
        ).map(
          product => [
            Number(
              product.id
            ),
            product
          ]
        )
      );


    const orderItems = [];


    let subtotal =
      0;


    for (
      const item of
      requestedItems
    ) {

      const product =
        productMap.get(
          item.product_id
        );


      if (!product) {

        return res
          .status(409)
          .json({
            error:
              "Um dos produtos do carrinho não está mais disponível. Atualize o pedido."
          });
      }


      const price =
        Number(
          product.price
        );


      if (
        !Number.isFinite(
          price
        ) ||
        price < 0
      ) {

        return res
          .status(500)
          .json({
            error:
              "Um produto está com preço inválido."
          });
      }


      subtotal +=
        price *
        item.qty;


      orderItems.push({
        product_id:
          product.id,

        name:
          product.name,

        qty:
          item.qty,

        unit_price:
          price
      });
    }


    /*
      =======================================================
      TAXA DE ENTREGA
      =======================================================
    */

    let deliveryFee =
      0;


    let neighborhoodId =
      null;


    if (
      fulfillment ===
      "delivery"
    ) {

      neighborhoodId =
        Number(
          body.neighborhood_id
        );


      if (
        !Number.isInteger(
          neighborhoodId
        ) ||
        neighborhoodId <= 0
      ) {

        return res
          .status(400)
          .json({
            error:
              "Bairro inválido."
          });
      }


      const neighborhoods =
        await supabaseRequest(
          `neighborhoods?id=eq.${neighborhoodId}&active=eq.true&select=id,name,fee,active`,
          {
            method:
              "GET"
          }
        );


      const neighborhood =
        Array.isArray(
          neighborhoods
        )
          ? neighborhoods[0]
          : null;


      if (!neighborhood) {

        return res
          .status(409)
          .json({
            error:
              "O bairro selecionado não está disponível para entrega."
          });
      }


      deliveryFee =
        Number(
          neighborhood.fee
        ) || 0;
    }


    /*
      =======================================================
      TOTAL CALCULADO NO SERVIDOR
      =======================================================
    */

    subtotal =
      Number(
        subtotal.toFixed(
          2
        )
      );


    deliveryFee =
      Number(
        deliveryFee.toFixed(
          2
        )
      );


    const total =
      Number(
        (
          subtotal +
          deliveryFee
        ).toFixed(
          2
        )
      );


    if (
      total <= 0
    ) {

      return res
        .status(400)
        .json({
          error:
            "Valor do pedido inválido."
        });
    }


    /*
      =======================================================
      DADOS DO PAYMENT BRICK
      =======================================================
    */

    const payment =
      body.payment || {};


    const paymentMethodId =
      payment
        .payment_method_id;


    const payer =
      payment.payer || {};


    const payerEmail =
      String(
        payer.email ||
          ""
      )
        .trim();


    if (
      !paymentMethodId ||
      !payerEmail
    ) {

      return res
        .status(400)
        .json({
          error:
            "Dados do pagamento incompletos."
        });
    }


    /*
      =======================================================
      CRIA PEDIDO NO SUPABASE
      =======================================================
    */

    const orderPayload = {

      customer_name:
        customerName,

      customer_phone:
        customerPhone,

      fulfillment,

      neighborhood_id:
        fulfillment ===
          "delivery"
          ? neighborhoodId
          : null,

      street:
        fulfillment ===
          "delivery"
          ? street
          : null,

      number:
        fulfillment ===
          "delivery"
          ? number
          : null,

      complement:
        fulfillment ===
          "delivery"
          ? complement ||
            null
          : null,

      payment_method:
        String(
          paymentMethodId
        ),

      notes:
        notes ||
        null,

      subtotal,

      delivery_fee:
        deliveryFee,

      total,

      status:
        "received",

      payment_status:
        "pending"
    };


    const createdOrders =
      await supabaseRequest(
        "orders",
        {
          method:
            "POST",

          headers: {
            Prefer:
              "return=representation"
          },

          body:
            JSON.stringify(
              orderPayload
            )
        }
      );


    const order =
      Array.isArray(
        createdOrders
      )
        ? createdOrders[0]
        : null;


    if (
      !order?.id
    ) {

      throw new Error(
        "Pedido não retornou ID."
      );
    }


    /*
      =======================================================
      CRIA ITENS DO PEDIDO
      =======================================================
    */

    const itemsToInsert =
      orderItems.map(
        item => ({
          order_id:
            order.id,

          product_id:
            item.product_id,

          name:
            item.name,

          qty:
            item.qty,

          unit_price:
            item.unit_price
        })
      );


    await supabaseRequest(
      "order_items",
      {
        method:
          "POST",

        headers: {
          Prefer:
            "return=minimal"
        },

        body:
          JSON.stringify(
            itemsToInsert
          )
      }
    );


    /*
      =======================================================
      REFERÊNCIA EXTERNA
      =======================================================
    */

    const externalReference =
      `lana-${order.id}`;


    await updateOrder(
      order.id,
      {
        external_reference:
          externalReference
      }
    );


    /*
      =======================================================
      MONTA PAGAMENTO MERCADO PAGO
      =======================================================
    */

    const mercadoPagoPayload = {

      transaction_amount:
        total,

      description:
        `Pedido Lana Lanches #${order.id}`,

      payment_method_id:
        paymentMethodId,

      external_reference:
        externalReference,

      payer: {
        email:
          payerEmail
      }
    };


    /*
      CPF / DOCUMENTO
    */

    if (
      payer.identification?.type &&
      payer.identification?.number
    ) {

      mercadoPagoPayload
        .payer
        .identification = {

        type:
          payer
            .identification
            .type,

        number:
          payer
            .identification
            .number
      };
    }


    /*
      NOME DO PAGADOR
    */

    if (
      payer.first_name
    ) {

      mercadoPagoPayload
        .payer
        .first_name =
        payer.first_name;
    }


    if (
      payer.last_name
    ) {

      mercadoPagoPayload
        .payer
        .last_name =
        payer.last_name;
    }


    /*
      CARTÃO
    */

    if (
      payment.token
    ) {

      mercadoPagoPayload.token =
        payment.token;
    }


    if (
      payment.installments
    ) {

      mercadoPagoPayload.installments =
        Number(
          payment.installments
        );
    }


    if (
      payment.issuer_id
    ) {

      mercadoPagoPayload.issuer_id =
        String(
          payment.issuer_id
        );
    }


    /*
      =======================================================
      IDEMPOTÊNCIA
      =======================================================
    */

    const idempotencyKey =
      crypto.randomUUID();


    /*
      =======================================================
      CRIA PAGAMENTO
      =======================================================
    */

    const mpResponse =
      await fetch(
        "https://api.mercadopago.com/v1/payments",
        {
          method:
            "POST",

          headers: {

            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/json",

            "X-Idempotency-Key":
              idempotencyKey
          },

          body:
            JSON.stringify(
              mercadoPagoPayload
            )
        }
      );


    const mpResult =
      await readJsonSafely(
        mpResponse
      );


    /*
      =======================================================
      PAGAMENTO NÃO CRIADO
      =======================================================
    */

    if (
      !mpResponse.ok
    ) {

      console.error(
        "Erro Mercado Pago:",
        mpResult
      );


      await updateOrder(
        order.id,
        {
          payment_status:
            "error",

          mercado_pago_status:
            "error",

          mercado_pago_status_detail:
            JSON.stringify(
              mpResult
            )
              .slice(
                0,
                500
              ),

          payment_updated_at:
            new Date()
              .toISOString()
        }
      );


      return res
        .status(
          mpResponse.status >=
            400 &&
          mpResponse.status <
            600
            ? mpResponse.status
            : 502
        )
        .json({

          error:
            "O Mercado Pago não conseguiu processar o pagamento.",

          order_id:
            order.id,

          details:
            mpResult
        });
    }


    /*
      =======================================================
      ATUALIZA PEDIDO COM O RESULTADO
      =======================================================
    */

    const internalPaymentStatus =
      paymentStatus(
        mpResult.status
      );


    await updateOrder(
      order.id,
      {

        payment_status:
          internalPaymentStatus,

        mercado_pago_payment_id:
          mpResult.id
            ? String(
                mpResult.id
              )
            : null,

        mercado_pago_status:
          mpResult.status ||
          null,

        mercado_pago_status_detail:
          mpResult.status_detail ||
          null,

        payment_updated_at:
          new Date()
            .toISOString(),

        external_reference:
          externalReference
      }
    );


    /*
      =======================================================
      RESPOSTA PARA O SITE
      =======================================================
    */

    return res
      .status(200)
      .json({

        order: {

          id:
            order.id,

          subtotal,

          delivery_fee:
            deliveryFee,

          total,

          status:
            order.status
        },


        payment: {

          id:
            mpResult.id,

          status:
            mpResult.status,

          status_detail:
            mpResult
              .status_detail,

          payment_method_id:
            mpResult
              .payment_method_id,

          payment_type_id:
            mpResult
              .payment_type_id,

          external_reference:
            externalReference,

          transaction_amount:
            mpResult
              .transaction_amount,

          date_created:
            mpResult
              .date_created
        },


        pix:
          mpResult
            .point_of_interaction
            ?.transaction_data
            ? {

                qr_code:
                  mpResult
                    .point_of_interaction
                    .transaction_data
                    .qr_code ||
                  null,

                qr_code_base64:
                  mpResult
                    .point_of_interaction
                    .transaction_data
                    .qr_code_base64 ||
                  null,

                ticket_url:
                  mpResult
                    .point_of_interaction
                    .transaction_data
                    .ticket_url ||
                  null

              }
            : null
      });


  } catch (
    error
  ) {

    console.error(
      "Erro create-payment:",
      error
    );


    return res
      .status(500)
      .json({
        error:
          "Erro interno ao processar o pedido."
      });
  }
}
