const money = value =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value) || 0);

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

let categories = [];
let products = [];
let neighborhoods = [];

let storeStatus = "closed";
let activeCategory = "Todos";

let cart = {};


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
    storeStatus ===
    "open"
  ) {

    badge.textContent =
      "🟢 Aberto";


    message
      .classList
      .add("hidden");

  } else if (
    storeStatus ===
    "paused"
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
      .innerHTML = `
        <div class="notice">
          Não foi possível carregar o cardápio.
        </div>
      `;
  }
}


/* =========================================================
   BOTÕES DE CATEGORIA
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


  /*
    Se a categoria selecionada for
    desativada ou ficar sem produtos,
    voltamos automaticamente para Todos.
  */

  if (
    activeCategory !==
      "Todos" &&
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
      .map(category => {

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
      })
      .join("");


  document
    .querySelectorAll(
      "[data-category]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          activeCategory =
            button.dataset
              .category;


          renderCategories();

          renderProducts();
        }
      );
    });
}


/* =========================================================
   ÍCONE PADRÃO
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
    name.includes(
      "cachorro"
    )
  ) {
    return "🌭";
  }


  if (
    name.includes(
      "past"
    )
  ) {
    return "🥟";
  }


  if (
    name.includes(
      "caldo"
    ) ||
    name.includes(
      "sopa"
    )
  ) {
    return "🥣";
  }


  if (
    name.includes(
      "porç"
    ) ||
    name.includes(
      "batata"
    )
  ) {
    return "🍟";
  }


  if (
    name.includes(
      "sobremesa"
    ) ||
    name.includes(
      "doce"
    )
  ) {
    return "🍰";
  }


  if (
    name.includes(
      "bebida"
    ) ||
    name.includes(
      "refrigerante"
    )
  ) {
    return "🥤";
  }


  if (
    name.includes(
      "combo"
    )
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
    activeCategory ===
      "Todos"
      ? visibleCategories
      : visibleCategories.filter(
          category =>
            category.name ===
            activeCategory
        );


  el("menu")
    .innerHTML =
    sections
      .map(category => {

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
                  .map(product => {

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
                              storeStatus !==
                              "open"
                                ? "disabled"
                                : ""
                            }
                          >
                            Adicionar
                          </button>

                        </div>

                      </article>
                    `;
                  })
                  .join("")
              }

            </div>

          </section>
        `;
      })
      .join("");


  document
    .querySelectorAll(
      "[data-add]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.dataset
              .add;


          cart[id] =
            (
              cart[id] ||
              0
            ) + 1;


          renderCart();
        }
      );
    });
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
        .eq(
          "active",
          true
        )
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
        .map(neighborhood => `
          <option value="${neighborhood.id}">
            ${escapeHTML(neighborhood.name)}
            •
            ${money(neighborhood.fee)}
          </option>
        `)
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
   TAXA DE ENTREGA
========================================================= */

function selectedFee() {

  const fulfillment =
    document.querySelector(
      'input[name="fulfillment"]:checked'
    )?.value ||
    "delivery";


  if (
    fulfillment ===
    "pickup"
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
    ? Number(
        neighborhood.fee
      )
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
        [productId, quantity]
      ) => {

        const product =
          products.find(
            item =>
              String(item.id) ===
              String(productId)
          );


        if (!product) {
          return total;
        }


        return total +
          Number(
            product.price
          ) *
          quantity;
      },
      0
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
          [, quantity]
        ) =>
          quantity > 0
      );


  let itemCount =
    0;


  const html =
    cartItems
      .map(
        (
          [productId, quantity]
        ) => {

          const product =
            products.find(
              item =>
                String(item.id) ===
                String(productId)
            );


          if (!product) {
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
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.dataset
              .minus;


          cart[id] =
            Math.max(
              0,
              (
                cart[id] ||
                0
              ) - 1
            );


          renderCart();
        }
      );
    });


  document
    .querySelectorAll(
      "[data-plus]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const id =
            button.dataset
              .plus;


          cart[id] =
            (
              cart[id] ||
              0
            ) + 1;


          renderCart();
        }
      );
    });
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
        storeStatus !==
        "open"
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
  .forEach(radio => {

    radio.addEventListener(
      "change",
      () => {

        const fulfillment =
          document.querySelector(
            'input[name="fulfillment"]:checked'
          ).value;


        el("delivery-fields")
          .classList
          .toggle(
            "hidden",
            fulfillment ===
              "pickup"
          );


        renderCart();
      }
    );
  });


el("neighborhood")
  .addEventListener(
    "change",
    renderCart
  );


/* =========================================================
   CONFIRMAR PEDIDO
========================================================= */

el("confirm-btn")
  .addEventListener(
    "click",
    async () => {

      const customerName =
        el("customer-name")
          .value
          .trim();


      const customerPhone =
        el("customer-phone")
          .value
          .trim();


      const paymentMethod =
        el("payment")
          .value;


      const fulfillment =
        document.querySelector(
          'input[name="fulfillment"]:checked'
        ).value;


      const neighborhoodId =
        el("neighborhood")
          .value;


      const street =
        el("street")
          .value
          .trim();


      const number =
        el("number")
          .value
          .trim();


      const complement =
        el("complement")
          .value
          .trim();


      const notes =
        el("notes")
          .value
          .trim();


      el("checkout-error")
        .textContent =
        "";


      if (
        !customerName ||
        !customerPhone ||
        !paymentMethod
      ) {

        el("checkout-error")
          .textContent =
          "Preencha nome, WhatsApp e forma de pagamento.";

        return;
      }


      if (
        fulfillment ===
          "delivery" &&
        (
          !neighborhoodId ||
          !street ||
          !number
        )
      ) {

        el("checkout-error")
          .textContent =
          "Preencha bairro, rua e número.";

        return;
      }


      if (
        storeStatus !==
        "open"
      ) {

        el("checkout-error")
          .textContent =
          "A loja não está recebendo pedidos agora.";

        return;
      }


      const orderItems =
        Object
          .entries(cart)
          .filter(
            (
              [, quantity]
            ) =>
              quantity > 0
          )
          .map(
            (
              [productId, quantity]
            ) => {

              const product =
                products.find(
                  item =>
                    String(item.id) ===
                    String(productId)
                );


              return {

                product_id:
                  product.id,

                name:
                  product.name,

                qty:
                  quantity,

                unit_price:
                  Number(
                    product.price
                  )
              };
            }
          );


      if (
        !orderItems.length
      ) {

        el("checkout-error")
          .textContent =
          "Seu carrinho está vazio.";

        return;
      }


      const sub =
        subtotal();


      const fee =
        selectedFee();


      const orderPayload = {

        customer_name:
          customerName,

        customer_phone:
          customerPhone,

        fulfillment,

        neighborhood_id:
          fulfillment ===
            "delivery"
            ? Number(
                neighborhoodId
              )
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
          paymentMethod,

        notes:
          notes ||
          null,

        subtotal:
          sub,

        delivery_fee:
          fee,

        total:
          sub + fee,

        status:
          "received"
      };


      el("confirm-btn")
        .disabled =
        true;


      el("confirm-btn")
        .textContent =
        "Enviando...";


      try {

        const {
          data: order,
          error: orderError
        } =
          await db
            .from("orders")
            .insert(
              orderPayload
            )
            .select()
            .single();


        if (orderError) {
          throw orderError;
        }


        const itemsToInsert =
          orderItems.map(
            item => ({
              ...item,
              order_id:
                order.id
            })
          );


        const {
          error: itemsError
        } =
          await db
            .from("order_items")
            .insert(
              itemsToInsert
            );


        if (itemsError) {
          throw itemsError;
        }


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
          `Pedido #${order.id} recebido com sucesso. Total: ${money(order.total)}.`;


        el("success")
          .scrollIntoView({
            behavior:
              "smooth",
            block:
              "center"
          });

      } catch (error) {

        console.error(
          "Erro ao criar pedido:",
          error
        );


        el("checkout-error")
          .textContent =
          "Não foi possível enviar o pedido. Tente novamente.";

      } finally {

        el("confirm-btn")
          .disabled =
          false;


        el("confirm-btn")
          .textContent =
          "Confirmar pedido";
      }
    }
  );


/* =========================================================
   NOVO PEDIDO
========================================================= */

el("new-order-btn")
  .addEventListener(
    "click",
    () => {

      el("success")
        .classList
        .add("hidden");


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


      el("payment")
        .value =
        "";


      el("notes")
        .value =
        "";


      el("neighborhood")
        .value =
        "";


      window.scrollTo({
        top: 0,
        behavior:
          "smooth"
      });
    }
  );


/* =========================================================
   INICIAR
========================================================= */

async function startApp() {

  try {

    /*
      As categorias precisam carregar
      junto dos produtos para montar
      o cardápio dinamicamente.
    */

    await Promise.all([
      loadStore(),
      loadCategories(),
      loadProducts(),
      loadNeighborhoods()
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
