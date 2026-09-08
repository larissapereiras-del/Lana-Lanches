export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  try {
    const accessToken =
      process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      console.error(
        "MERCADO_PAGO_ACCESS_TOKEN não configurado."
      );

      return res.status(500).json({
        error:
          "Configuração de pagamento indisponível."
      });
    }

    const body = req.body || {};

    const paymentMethodId =
      body.payment_method_id;

    const transactionAmount =
      Number(body.transaction_amount);

    const payer =
      body.payer;

    if (
      !paymentMethodId ||
      !transactionAmount ||
      transactionAmount <= 0 ||
      !payer?.email
    ) {
      return res.status(400).json({
        error:
          "Dados do pagamento incompletos."
      });
    }

    const paymentData = {
      transaction_amount:
        transactionAmount,

      payment_method_id:
        paymentMethodId,

      payer: {
        email:
          payer.email,

        first_name:
          payer.first_name || undefined,

        last_name:
          payer.last_name || undefined,

        identification:
          payer.identification
            ? {
                type:
                  payer.identification.type,

                number:
                  payer.identification.number
              }
            : undefined
      },

      description:
        body.description ||
        "Pedido Lana Lanches",

      external_reference:
        body.external_reference ||
        undefined
    };


    /*
      Cartão
    */

    if (body.token) {
      paymentData.token =
        body.token;
    }


    if (body.installments) {
      paymentData.installments =
        Number(
          body.installments
        );
    }


    if (body.issuer_id) {
      paymentData.issuer_id =
        String(
          body.issuer_id
        );
    }


    /*
      Gera uma chave única para evitar
      cobranças duplicadas.
    */

    const idempotencyKey =
      crypto.randomUUID();


    const response =
      await fetch(
        "https://api.mercadopago.com/v1/payments",
        {
          method: "POST",

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
              paymentData
            )
        }
      );


    const result =
      await response.json();


    if (!response.ok) {
      console.error(
        "Erro Mercado Pago:",
        result
      );

      return res
        .status(response.status)
        .json({
          error:
            "O Mercado Pago não conseguiu processar o pagamento.",

          details:
            result
        });
    }


    /*
      Retornamos apenas os dados que
      o site precisa.
    */

    return res
      .status(200)
      .json({
        id:
          result.id,

        status:
          result.status,

        status_detail:
          result.status_detail,

        payment_method_id:
          result.payment_method_id,

        payment_type_id:
          result.payment_type_id,

        external_reference:
          result.external_reference,

        transaction_amount:
          result.transaction_amount,

        date_created:
          result.date_created,

        point_of_interaction:
          result.point_of_interaction
            ? {
                transaction_data:
                  result.point_of_interaction
                    .transaction_data
                    ? {
                        qr_code:
                          result.point_of_interaction
                            .transaction_data
                            .qr_code,

                        qr_code_base64:
                          result.point_of_interaction
                            .transaction_data
                            .qr_code_base64,

                        ticket_url:
                          result.point_of_interaction
                            .transaction_data
                            .ticket_url
                      }
                    : null
              }
            : null
      });

  } catch (error) {
    console.error(
      "Erro create-payment:",
      error
    );

    return res
      .status(500)
      .json({
        error:
          "Erro interno ao processar pagamento."
      });
  }
}
