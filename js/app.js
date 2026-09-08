const money = value =>
  new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  ).format(
    Number(value) || 0
  );


const el = id =>
  document.getElementById(id);


function escapeHTML(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}



/* =========================================================
   DADOS
========================================================= */

let categories = [];
let products = [];
let neighborhoods = [];

let storeStatus = "closed";
let activeCategory = "Todos";

let cart = {};



/* =========================================================
   MERCADO PAGO
========================================================= */

let mercadoPagoInstance = null;

let bricksBuilder = null;

let paymentBrickController = null;

let paymentPublicKey = "";

let paymentPrepared = false;

let paymentSubmitting = false;



/* =========================================================
   LOJA
========================================================= */

async function loadStore() {

  try {

    const {
      data,
      error
    } =
      await db
        .from("store_settings")
        .select("id,status")
        .eq("id", 1)
        .single();


    if (error) {
      throw error;
    }


    storeStatus =
      data?.status ||
      "closed";


    renderStoreStatus();

  } catch (error) {

    console.error(
      "Erro ao carregar loja:",
      error
    );


    storeStatus =
      "closed";


    el("store-status")
      .textContent =
      "🔴 Indisponível";


    el("store-message")
      .textContent =
      "Não foi possível carregar o status da loja.";


    el("store-message")
      .classList
      .remove("hidden");
  }
}



function renderStoreStatus() {

  const badge =
    el("store-status");


  const message =
    el("store-message");


  if (
    storeStatus === "open"
  ) {

    badge.textContent =
      "🟢 Aberto";


    message
      .classList
      .add("hidden");

  } else if (
    storeStatus === "paused"
  ) {

    badge.textContent =
      "🟡 Pausado";


    message.textContent =
      "Estamos com muitos pedidos no momento. Novos pedidos estão temporariamente pausados.";


    message
      .classList
      .remove("hidden");

  } else {

    badge.textContent =
      "🔴 Fechado";


    message.textContent =
      "Estamos fechados no momento. Você ainda pode consultar o cardápio.";


    message
      .classList
      .remove("hidden");
  }


  renderProducts();
}



/* =========================================================
   CATEGORIAS
========================================================= */

async function loadCategories() {

  try {

    const {
      data,
      error
    } =
      await db
        .from("categories")
        .select("*")
        .eq("active", true)
        .order(
          "sort_order",
          {
            ascending: true
          }
        )
        .order(
          "name",
          {
            ascending: true
          }
        );


    if (error) {
      throw error;
    }


    categories =
      data || [];


    renderCategories();

    renderProducts();

  } catch (error) {

    console.error(
      "Erro ao carregar categorias:",
      error
    );
  }
}



/* =========================================================
   PRODUTOS
========================================================= */

async function loadProducts() {

  try {

    const {
      data,
      error
    } =
      await db
        .from("products")
        .select("*")
        .eq("active", true)
        .order(
          "sort_order",
          {
            ascending: true
          }
        );


    if (error) {
      throw error;
    }


    products =
      data || [];


    renderCategories();

    renderProducts();

  } catch (error) {

    console.error(
      "Erro ao carregar produtos:",
      error
    );


    el("menu")
      .innerHTML =
      `
        <div class="notice">
          Não foi possível carregar o cardápio.
        </div>
      `;
  }
}



/* =========================================================
   BOTÕES DAS CATEGORIAS
========================================================= */

function renderCategories() {

  const visibleCategories =
    categories.filter(
      category =>
        products.some(
          product =>
            product.category ===
            category.name
        )
    );


  if (
    activeCategory !== "Todos" &&
    !visibleCategories.some(
      category =>
        category.name ===
        activeCategory
    )
  ) {

    activeCategory =
      "Todos";
  }


  const buttons = [
    {
      name: "Todos"
    },
    ...visibleCategories
  ];


  el("categories")
    .innerHTML =
    buttons
      .map(
        category => {

          const name =
            category.name;


          return `
            <button
              class="category-btn ${
                activeCategory === name
                  ? "active"
                  : ""
              }"
              data-category="${escapeHTML(name)}"
            >
              ${escapeHTML(name)}
            </button>
          `;
        }
      )
      .join("");


  document
    .querySelectorAll(
      "[data-category]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            activeCategory =
              button.dataset.category;


            renderCategories();

            renderProducts();
          }
        );
      }
    );
}



/* =========================================================
   ÍCONES
========================================================= */

function categoryIcon(
  categoryName
) {

  const name =
    String(
      categoryName || ""
    )
      .toLowerCase();


  if (
    name.includes("cachorro")
  ) {
    return "🌭";
  }


  if (
    name.includes("past")
  ) {
    return "🥟";
  }


  if (
    name.includes("caldo") ||
    name.includes("sopa")
  ) {
    return "🥣";
  }


  if (
    name.includes("porç") ||
    name.includes("batata")
  ) {
    return "🍟";
  }


  if (
    name.includes("sobremesa") ||
    name.includes("doce")
  ) {
    return "🍰";
  }


  if (
    name.includes("bebida") ||
    name.includes("refrigerante")
  ) {
    return "🥤";
  }


  if (
    name.includes("combo")
  ) {
    return "🍔";
  }


  return "🍽️";
}



/* =========================================================
   CARDÁPIO
========================================================= */

function renderProducts() {

  if (
    !el("menu")
  ) {
    return;
  }


  if (
    !products.length
  ) {

    el("menu")
      .innerHTML =
      "";

    return;
  }


  const visibleCategories =
    categories.filter(
      category =>
        products.some(
          product =>
            product.category ===
            category.name
        )
    );


  const sections =
    activeCategory === "Todos"
      ? visibleCategories
      : visibleCategories.filter(
          category =>
            category.name ===
            activeCategory
        );


  el("menu")
    .innerHTML =
    sections
      .map(
        category => {

          const items =
            products.filter(
              product =>
                product.category ===
                category.name
            );


          if (
            !items.length
          ) {
            return "";
          }


          return `
            <section class="menu-section">

              <h2>
                ${escapeHTML(category.name)}
              </h2>


              <div class="product-grid">

                ${
                  items
                    .map(
                      product => {

                        const image =
                          product.image_url
                            ? `
                              <div class="product-image-wrap">

                                <img
                                  class="product-image"
                                  src="${escapeHTML(product.image_url)}"
                                  alt="${escapeHTML(product.name)}"
                                  loading="lazy"
                                >

                              </div>
                            `
                            : `
                              <div class="product-image-wrap product-image-placeholder">

                                <span>
                                  ${categoryIcon(category.name)}
                                </span>

                              </div>
                            `;


                        return `
                          <article class="product">

                            ${image}


                            <div class="product-content">

                              <div class="product-info">

                                <h3>
                                  ${escapeHTML(product.name)}
                                </h3>


                                ${
                                  product.description
                                    ? `
                                      <p>
                                        ${escapeHTML(product.description)}
                                      </p>
                                    `
                                    : ""
                                }


                                <div class="price">
                                  ${money(product.price)}
                                </div>

                              </div>


                              <button
                                class="primary-btn product-add-btn"
                                data-add="${product.id}"
                                ${
                                  storeStatus !== "open"
                                    ? "disabled"
                                    : ""
                                }
                              >
                                Adicionar
                              </button>

                            </div>

                          </article>
                        `;
                      }
                    )
                    .join("")
                }

              </div>

            </section>
          `;
        }
      )
      .join("");


  document
    .querySelectorAll(
      "[data-add]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.add;


            cart[id] =
              (
                cart[id] ||
                0
              ) + 1;


            invalidatePayment();

            renderCart();
          }
        );
      }
    );
}



/* =========================================================
   BAIRROS
========================================================= */

async function loadNeighborhoods() {

  try {

    const {
      data,
      error
    } =
      await db
        .from("neighborhoods")
        .select("*")
        .eq("active", true)
        .order("name");


    if (error) {
      throw error;
    }


    neighborhoods =
      data || [];


    el("neighborhood")
      .innerHTML =
      `
        <option value="">
          Selecione o bairro
        </option>
      ` +
      neighborhoods
        .map(
          neighborhood => `
            <option value="${neighborhood.id}">
              ${escapeHTML(neighborhood.name)}
              •
              ${money(neighborhood.fee)}
            </option>
          `
        )
        .join("");


    renderCart();

  } catch (error) {

    console.error(
      "Erro ao carregar bairros:",
      error
    );
  }
}



/* =========================================================
   ENTREGA / RETIRADA
========================================================= */

function getFulfillment() {

  return document
    .querySelector(
      'input[name="fulfillment"]:checked'
    )
    ?.value ||
    "delivery";
}



function selectedFee() {

  const fulfillment =
    getFulfillment();


  if (
    fulfillment === "pickup"
  ) {
    return 0;
  }


  const neighborhoodId =
    el("neighborhood")
      .value;


  const neighborhood =
    neighborhoods.find(
      item =>
        String(item.id) ===
        String(neighborhoodId)
    );


  return neighborhood
    ? Number(neighborhood.fee)
    : 0;
}



/* =========================================================
   SUBTOTAL
========================================================= */

function subtotal() {

  return Object
    .entries(cart)
    .reduce(
      (
        total,
        [
          productId,
          quantity
        ]
      ) => {

        const product =
          products.find(
            item =>
              String(item.id) ===
              String(productId)
          );


        if (
          !product
        ) {
          return total;
        }


        return total +
          Number(product.price) *
          quantity;
      },
      0
    );
}



/* =========================================================
   TOTAL
========================================================= */

function orderTotal() {

  return Number(
    (
      subtotal() +
      selectedFee()
    )
      .toFixed(2)
  );
}



/* =========================================================
   CARRINHO
========================================================= */

function renderCart() {

  const cartItems =
    Object
      .entries(cart)
      .filter(
        (
          [
            ,
            quantity
          ]
        ) =>
          quantity > 0
      );


  let itemCount =
    0;


  const html =
    cartItems
      .map(
        (
          [
            productId,
            quantity
          ]
        ) => {

          const product =
            products.find(
              item =>
                String(item.id) ===
                String(productId)
            );


          if (
            !product
          ) {
            return "";
          }


          itemCount +=
            quantity;


          return `
            <div class="cart-row">

              <div>

                <strong>
                  ${escapeHTML(product.name)}
                </strong>

                <br>

                <small>
                  ${quantity}
                  ×
                  ${money(product.price)}
                </small>

              </div>


              <div class="qty-controls">

                <button
                  class="qty-btn"
                  data-minus="${productId}"
                >
                  −
                </button>


                <button
                  class="qty-btn"
                  data-plus="${productId}"
                >
                  +
                </button>

              </div>

            </div>
          `;
        }
      )
      .join("");


  el("cart-items")
    .innerHTML =
    html ||
    "<p>Seu carrinho está vazio.</p>";


  el("cart-count")
    .textContent =
    `${itemCount} ${
      itemCount === 1
        ? "item"
        : "itens"
    }`;


  const sub =
    subtotal();


  const fee =
    selectedFee();


  const total =
    sub + fee;


  el("subtotal")
    .textContent =
    money(sub);


  el("delivery-fee")
    .textContent =
    money(fee);


  el("total")
    .textContent =
    money(total);


  el("checkout-subtotal")
    .textContent =
    money(sub);


  el("checkout-fee")
    .textContent =
    money(fee);


  el("checkout-total")
    .textContent =
    money(total);


  document
    .querySelectorAll(
      "[data-minus]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.minus;


            cart[id] =
              Math.max(
                0,
                (
                  cart[id] ||
                  0
                ) - 1
              );


            invalidatePayment();

            renderCart();
          }
        );
      }
    );


  document
    .querySelectorAll(
      "[data-plus]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const id =
              button.dataset.plus;


            cart[id] =
              (
                cart[id] ||
                0
              ) + 1;


            invalidatePayment();

            renderCart();
          }
        );
      }
    );
}



/* =========================================================
   ITENS PARA O BACKEND
========================================================= */

function getCartItemsForBackend() {

  return Object
    .entries(cart)
    .filter(
      (
        [
          ,
          quantity
        ]
      ) =>
        quantity > 0
    )
    .map(
      (
        [
          productId,
          quantity
        ]
      ) => ({

        product_id:
          Number(productId),

        qty:
          Number(quantity)
      })
    );
}



/* =========================================================
   CONTINUAR PEDIDO
========================================================= */

el("continue-btn")
  .addEventListener(
    "click",
    () => {

      el("cart-error")
        .textContent =
        "";


      if (
        storeStatus !== "open"
      ) {

        el("cart-error")
          .textContent =
          "A loja não está recebendo pedidos agora.";

        return;
      }


      if (
        subtotal() <= 0
      ) {

        el("cart-error")
          .textContent =
          "Adicione pelo menos um item.";

        return;
      }


      el("checkout")
        .classList
        .remove("hidden");


      el("checkout")
        .scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    }
  );



/* =========================================================
   DELIVERY / RETIRADA
========================================================= */

document
  .querySelectorAll(
    'input[name="fulfillment"]'
  )
  .forEach(
    radio => {

      radio.addEventListener(
        "change",
        () => {

          const fulfillment =
            getFulfillment();


          el("delivery-fields")
            .classList
            .toggle(
              "hidden",
              fulfillment === "pickup"
            );


          invalidatePayment();

          renderCart();
        }
      );
    }
  );


el("neighborhood")
  .addEventListener(
    "change",
    () => {

      invalidatePayment();

      renderCart();
    }
  );



/* =========================================================
   CONFIGURAÇÃO MERCADO PAGO
========================================================= */

async function loadMercadoPago() {

  try {

    const response =
      await fetch(
        "/api/payment-config",
        {
          method: "GET",
          cache: "no-store"
        }
      );


    const result =
      await response.json();


    if (
      !response.ok
    ) {

      throw new Error(
        result?.error ||
        "Não foi possível carregar o Mercado Pago."
      );
    }


    if (
      !result.publicKey
    ) {

      throw new Error(
        "Public Key não encontrada."
      );
    }


    paymentPublicKey =
      result.publicKey;


    if (
      typeof MercadoPago ===
      "undefined"
    ) {

      throw new Error(
        "SDK do Mercado Pago não carregou."
      );
    }


    mercadoPagoInstance =
      new MercadoPago(
        paymentPublicKey,
        {
          locale: "pt-BR"
        }
      );


    bricksBuilder =
      mercadoPagoInstance
        .bricks();


    console.log(
      "Mercado Pago carregado."
    );

  } catch (error) {

    console.error(
      "Erro Mercado Pago:",
      error
    );


    mercadoPagoInstance =
      null;


    bricksBuilder =
      null;
  }
}



/* =========================================================
   DESTRUIR PAYMENT BRICK
========================================================= */

async function unmountPaymentBrick() {

  if (
    !paymentBrickController
  ) {
    return;
  }


  try {

    await paymentBrickController
      .unmount();

  } catch (error) {

    console.warn(
      "Não foi possível remover o Payment Brick:",
      error
    );
  }


  paymentBrickController =
    null;
}



/* =========================================================
   INVALIDAR PAGAMENTO
========================================================= */

async function invalidatePayment() {

  if (
    !paymentPrepared &&
    !paymentBrickController
  ) {
    return;
  }


  if (
    paymentSubmitting
  ) {
    return;
  }


  paymentPrepared =
    false;


  await unmountPaymentBrick();


  const mercadoPagoSection =
    el(
      "mercado-pago-section"
    );


  if (
    mercadoPagoSection
  ) {

    mercadoPagoSection
      .classList
      .add("hidden");
  }


  const confirmButton =
    el("confirm-btn");


  if (
    confirmButton
  ) {

    confirmButton
      .classList
      .remove("hidden");


    confirmButton.disabled =
      false;


    confirmButton.textContent =
      "Ir para pagamento";
  }


  const paymentMessage =
    el(
      "payment-message"
    );


  if (
    paymentMessage
  ) {

    paymentMessage
      .classList
      .add("hidden");


    paymentMessage
      .innerHTML =
      "";
  }
}



/* =========================================================
   DADOS DO CHECKOUT
========================================================= */

function getCheckoutData() {

  const fulfillment =
    getFulfillment();


  return {

    customer_name:
      el("customer-name")
        .value
        .trim(),

    customer_phone:
      el("customer-phone")
        .value
        .trim(),

    fulfillment,

    neighborhood_id:
      fulfillment === "delivery"
        ? el("neighborhood").value
        : null,

    street:
      fulfillment === "delivery"
        ? el("street")
            .value
            .trim()
        : null,

    number:
      fulfillment === "delivery"
        ? el("number")
            .value
            .trim()
        : null,

    complement:
      fulfillment === "delivery"
        ? el("complement")
            .value
            .trim()
        : null,

    notes:
      el("notes")
        .value
        .trim(),

    items:
      getCartItemsForBackend()
  };
}



/* =========================================================
   VALIDAR CHECKOUT
========================================================= */

function validateCheckout() {

  const data =
    getCheckoutData();


  el("checkout-error")
    .textContent =
    "";


  if (
    !data.customer_name ||
    !data.customer_phone
  ) {

    el("checkout-error")
      .textContent =
      "Preencha seu nome e WhatsApp.";

    return null;
  }


  if (
    data.customer_phone
      .replace(
        /\D/g,
        ""
      )
      .length < 10
  ) {

    el("checkout-error")
      .textContent =
      "Informe um WhatsApp válido.";

    return null;
  }


  if (
    data.fulfillment === "delivery" &&
    (
      !data.neighborhood_id ||
      !data.street ||
      !data.number
    )
  ) {

    el("checkout-error")
      .textContent =
      "Preencha bairro, rua e número.";

    return null;
  }


  if (
    !data.items.length
  ) {

    el("checkout-error")
      .textContent =
      "Seu carrinho está vazio.";

    return null;
  }


  if (
    storeStatus !== "open"
  ) {

    el("checkout-error")
      .textContent =
      "A loja não está recebendo pedidos agora.";

    return null;
  }


  if (
    orderTotal() <= 0
  ) {

    el("checkout-error")
      .textContent =
      "O valor do pedido é inválido.";

    return null;
  }


  return data;
}



/* =========================================================
   MENSAGEM DO PAGAMENTO
========================================================= */

function showPaymentMessage(
  message,
  type = "error"
) {

  const box =
    el("payment-message");


  if (
    !box
  ) {
    return;
  }


  box
    .classList
    .remove("hidden");


  box.innerHTML =
    `
      <p class="${escapeHTML(type)}">
        ${escapeHTML(message)}
      </p>
    `;
}



/* =========================================================
   PROCESSANDO
========================================================= */

function setPaymentProcessing(
  processing
) {

  paymentSubmitting =
    processing;


  const box =
    el(
      "payment-processing"
    );


  if (
    box
  ) {

    box
      .classList
      .toggle(
        "hidden",
        !processing
      );
  }
}



/* =========================================================
   SUCESSO
========================================================= */

async function showOrderSuccess(
  result
) {

  const order =
    result?.order;


  const payment =
    result?.payment;


  const pix =
    result?.pix;


  if (
    !order
  ) {

    throw new Error(
      "Pedido não retornado pelo servidor."
    );
  }


  paymentPrepared =
    false;


  await unmountPaymentBrick();


  cart = {};


  renderCart();


  el("checkout")
    .classList
    .add("hidden");


  el("success")
    .classList
    .remove("hidden");


  el("success-text")
    .textContent =
    `Pedido #${order.id} recebido. Total: ${money(order.total)}.`;


  const successPayment =
    el(
      "success-payment"
    );


  successPayment
    .classList
    .remove("hidden");


  if (
    payment?.status ===
    "approved"
  ) {

    successPayment
      .innerHTML =
      `
        <div class="payment-result payment-approved">

          <h3>
            ✅ Pagamento aprovado
          </h3>

          <p>
            Seu pagamento foi confirmado.
            Já recebemos o seu pedido.
          </p>

        </div>
      `;

  } else if (
    pix?.qr_code ||
    pix?.qr_code_base64
  ) {

    const qrImage =
      pix.qr_code_base64
        ? `
          <img
            src="data:image/png;base64,${escapeHTML(pix.qr_code_base64)}"
            alt="QR Code Pix"
            style="
              display:block;
              width:220px;
              max-width:100%;
              margin:20px auto;
            "
          >
        `
        : "";


    const pixCode =
      pix.qr_code
        ? `
          <div class="pix-copy-area">

            <p>
              <strong>
                Pix Copia e Cola
              </strong>
            </p>

            <textarea
              id="pix-code"
              readonly
              style="
                width:100%;
                min-height:100px;
                resize:none;
              "
            >${escapeHTML(pix.qr_code)}</textarea>


            <button
              id="copy-pix-btn"
              type="button"
              class="secondary-btn"
            >
              Copiar código Pix
            </button>

          </div>
        `
        : "";


    successPayment
      .innerHTML =
      `
        <div class="payment-result payment-pix">

          <h3>
            📱 Pague com Pix
          </h3>

          <p>
            Seu pedido #${order.id} foi criado.
            Faça o pagamento abaixo para confirmar.
          </p>

          ${qrImage}

          ${pixCode}

        </div>
      `;


    const copyButton =
      el(
        "copy-pix-btn"
      );


    if (
      copyButton &&
      pix.qr_code
    ) {

      copyButton.addEventListener(
        "click",
        async () => {

          try {

            await navigator
              .clipboard
              .writeText(
                pix.qr_code
              );


            copyButton
              .textContent =
              "✅ Código copiado";

          } catch (error) {

            console.error(
              "Erro ao copiar Pix:",
              error
            );


            const pixCodeField =
              el("pix-code");


            if (
              pixCodeField
            ) {

              pixCodeField
                .select();
            }
          }
        }
      );
    }

  } else if (
    payment?.status === "pending" ||
    payment?.status === "in_process" ||
    payment?.status === "authorized"
  ) {

    successPayment
      .innerHTML =
      `
        <div class="payment-result payment-pending">

          <h3>
            ⏳ Pagamento em processamento
          </h3>

          <p>
            Seu pedido foi recebido.
            Estamos aguardando a confirmação do pagamento.
          </p>

        </div>
      `;

  } else {

    successPayment
      .innerHTML =
      `
        <div class="payment-result">

          <h3>
            Pedido recebido
          </h3>

          <p>
            O status do pagamento será atualizado assim que houver confirmação.
          </p>

        </div>
      `;
  }


  el("success")
    .scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
}



/* =========================================================
   ENVIAR PARA O BACKEND
========================================================= */

async function sendPayment(
  formData
) {

  const checkoutData =
    validateCheckout();


  if (
    !checkoutData
  ) {

    throw new Error(
      "Dados do pedido inválidos."
    );
  }


  const payload = {

    ...checkoutData,

    payment:
      formData
  };


  console.log(
    "Enviando pagamento:",
    {
      payment_method_id:
        formData
          ?.payment_method_id,

      hasPayer:
        Boolean(
          formData
            ?.payer
        ),

      total:
        orderTotal()
    }
  );


  const response =
    await fetch(
      "/api/create-payment",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(
            payload
          )
      }
    );


  let result;


  try {

    result =
      await response
        .json();

  } catch {

    result = {
      error:
        "Resposta inválida do servidor."
    };
  }


  if (
    !response.ok
  ) {

    const message =
      result?.error ||
      "Não foi possível processar o pagamento.";


    console.error(
      "Erro do backend:",
      result
    );


    throw new Error(
      message
    );
  }


  return result;
}



/* =========================================================
   PAYMENT BRICK
========================================================= */

async function renderPaymentBrick() {

  const checkoutData =
    validateCheckout();


  if (
    !checkoutData
  ) {
    return;
  }


  if (
    !bricksBuilder
  ) {

    el("checkout-error")
      .textContent =
      "O pagamento ainda está sendo carregado. Aguarde alguns segundos e tente novamente.";

    return;
  }


  const total =
    orderTotal();


  if (
    total <= 0
  ) {

    el("checkout-error")
      .textContent =
      "O valor do pedido é inválido.";

    return;
  }


  await unmountPaymentBrick();


  const paymentContainer =
    el(
      "paymentBrick_container"
    );


  if (
    paymentContainer
  ) {

    paymentContainer
      .innerHTML =
      "";
  }


  el("checkout-error")
    .textContent =
    "";


  el("payment-message")
    .innerHTML =
    "";


  el("payment-message")
    .classList
    .add("hidden");


  el("mercado-pago-section")
    .classList
    .remove("hidden");


  el("confirm-btn")
    .classList
    .add("hidden");


  el("payment-processing")
    .classList
    .remove("hidden");


  paymentPrepared =
    true;


  try {

    const settings = {

      initialization: {

        amount:
          total
      },


      customization: {

        paymentMethods: {

          creditCard:
            "all",

          debitCard:
            "all",

          bankTransfer:
            "all"
        }
      },


      callbacks: {

        onReady: () => {

          el("payment-processing")
            .classList
            .add("hidden");


          el("mercado-pago-section")
            .scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
        },


        onSubmit:
          async ({
            selectedPaymentMethod,
            formData
          }) => {

            console.log(
              "Meio selecionado:",
              selectedPaymentMethod
            );


            console.log(
              "Dados recebidos do Mercado Pago:",
              formData
            );


            if (
              !formData
            ) {

              showPaymentMessage(
                "O Mercado Pago não retornou os dados do pagamento."
              );


              throw new Error(
                "Dados do pagamento não recebidos."
              );
            }


            setPaymentProcessing(
              true
            );


            el("payment-message")
              .classList
              .add("hidden");


            try {

              const result =
                await sendPayment(
                  formData
                );


              if (
                result?.payment
                  ?.status ===
                "rejected"
              ) {

                console.warn(
                  "Pagamento recusado:",
                  result.payment
                    .status_detail
                );


                showPaymentMessage(
                  "O pagamento foi recusado. Confira os dados e tente novamente."
                );


                throw new Error(
                  "Pagamento recusado."
                );
              }


              if (
                result?.payment
                  ?.status ===
                "cancelled"
              ) {

                showPaymentMessage(
                  "O pagamento foi cancelado. Tente novamente."
                );


                throw new Error(
                  "Pagamento cancelado."
                );
              }


              await showOrderSuccess(
                result
              );


              return result;

            } catch (error) {

              console.error(
                "Erro ao processar pagamento:",
                error
              );


              if (
                error.message !==
                  "Pagamento recusado." &&
                error.message !==
                  "Pagamento cancelado."
              ) {

                showPaymentMessage(
                  error.message ||
                  "Não foi possível concluir o pagamento."
                );
              }


              throw error;

            } finally {

              setPaymentProcessing(
                false
              );
            }
          },


        onError:
          error => {

            console.error(
              "Erro Payment Brick:",
              error
            );


            setPaymentProcessing(
              false
            );


            showPaymentMessage(
              "Não foi possível carregar ou processar o pagamento. Tente novamente."
            );
          }
      }
    };


    paymentBrickController =
      await bricksBuilder
        .create(
          "payment",
          "paymentBrick_container",
          settings
        );

  } catch (error) {

    console.error(
      "Erro ao renderizar Payment Brick:",
      error
    );


    paymentPrepared =
      false;


    el("payment-processing")
      .classList
      .add("hidden");


    el("confirm-btn")
      .classList
      .remove("hidden");


    showPaymentMessage(
      "Não foi possível carregar as formas de pagamento. Tente novamente."
    );
  }
}



/* =========================================================
   BOTÃO IR PARA PAGAMENTO
========================================================= */

el("confirm-btn")
  .addEventListener(
    "click",
    async () => {

      const checkoutData =
        validateCheckout();


      if (
        !checkoutData
      ) {
        return;
      }


      el("confirm-btn")
        .disabled =
        true;


      el("confirm-btn")
        .textContent =
        "Carregando pagamento...";


      try {

        await renderPaymentBrick();

      } finally {

        if (
          !paymentPrepared
        ) {

          el("confirm-btn")
            .disabled =
            false;


          el("confirm-btn")
            .textContent =
            "Ir para pagamento";
        }
      }
    }
  );



/* =========================================================
   NOVO PEDIDO
========================================================= */

el("new-order-btn")
  .addEventListener(
    "click",
    async () => {

      await unmountPaymentBrick();


      paymentPrepared =
        false;


      paymentSubmitting =
        false;


      el("success")
        .classList
        .add("hidden");


      el("success-payment")
        .classList
        .add("hidden");


      el("success-payment")
        .innerHTML =
        "";


      el("customer-name")
        .value =
        "";


      el("customer-phone")
        .value =
        "";


      el("street")
        .value =
        "";


      el("number")
        .value =
        "";


      el("complement")
        .value =
        "";


      el("notes")
        .value =
        "";


      el("neighborhood")
        .value =
        "";


      const deliveryRadio =
        document.querySelector(
          'input[name="fulfillment"][value="delivery"]'
        );


      if (
        deliveryRadio
      ) {

        deliveryRadio.checked =
          true;
      }


      el("delivery-fields")
        .classList
        .remove("hidden");


      el("mercado-pago-section")
        .classList
        .add("hidden");


      el("payment-message")
        .classList
        .add("hidden");


      el("payment-message")
        .innerHTML =
        "";


      el("confirm-btn")
        .classList
        .remove("hidden");


      el("confirm-btn")
        .disabled =
        false;


      el("confirm-btn")
        .textContent =
        "Ir para pagamento";


      renderCart();


      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  );



/* =========================================================
   PREPARAR INTERFACE
========================================================= */

function preparePaymentInterface() {

  const legacyPayment =
    el(
      "legacy-payment-section"
    );


  if (
    legacyPayment
  ) {

    legacyPayment
      .classList
      .add("hidden");
  }


  const mercadoPagoSection =
    el(
      "mercado-pago-section"
    );


  if (
    mercadoPagoSection
  ) {

    mercadoPagoSection
      .classList
      .add("hidden");
  }


  const confirmButton =
    el("confirm-btn");


  if (
    confirmButton
  ) {

    confirmButton
      .textContent =
      "Ir para pagamento";
  }
}



/* =========================================================
   INICIAR
========================================================= */

async function startApp() {

  try {

    preparePaymentInterface();


    await Promise.all([

      loadStore(),

      loadCategories(),

      loadProducts(),

      loadNeighborhoods(),

      loadMercadoPago()
    ]);


    renderCategories();

    renderProducts();

    renderCart();

  } catch (error) {

    console.error(
      "Erro ao iniciar site:",
      error
    );


    el("store-status")
      .textContent =
      "🔴 Indisponível";
  }
}



startApp();
