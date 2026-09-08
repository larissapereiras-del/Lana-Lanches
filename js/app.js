const categoryOrder = [
  "Cachorro-quente",
  "Pastéis",
  "Caldos",
  "Porções"
];

const money = value =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value || 0);

let products = [];
let neighborhoods = [];
let storeStatus = "closed";
let activeCategory = "Todos";
let cart = {};

const el = id => document.getElementById(id);


/* =========================
   CARREGAR STATUS DA LOJA
========================= */

async function loadStore() {

  const { data, error } = await db
    .from("store_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {

    showStoreError(
      "Não foi possível carregar o status da loja."
    );

    return;
  }

  storeStatus = data.status;

  renderStoreStatus();
}


/* =========================
   CARREGAR PRODUTOS
========================= */

async function loadProducts() {

  const { data, error } = await db
    .from("products")
    .select("*")
    .order("sort_order");

  if (error) {

    showStoreError(
      "Não foi possível carregar o cardápio."
    );

    return;
  }

  products = data || [];

  renderCategories();

  renderProducts();
}


/* =========================
   CARREGAR BAIRROS
========================= */

async function loadNeighborhoods() {

  const { data, error } = await db
    .from("neighborhoods")
    .select("*")
    .eq("active", true)
    .order("name");

  if (error) {

    console.error(
      "Erro ao carregar bairros:",
      error
    );

    return;
  }

  neighborhoods = data || [];

  const select = el("neighborhood");

  select.innerHTML =
    '<option value="">Selecione o bairro</option>' +

    neighborhoods
      .map(
        neighborhood => `
          <option value="${neighborhood.id}">
            ${neighborhood.name} • ${money(neighborhood.fee)}
          </option>
        `
      )
      .join("");

  renderCart();
}


/* =========================
   ERRO GERAL
========================= */

function showStoreError(message) {

  const box = el("store-message");

  box.textContent = message;

  box.classList.remove("hidden");
}


/* =========================
   STATUS DA LOJA
========================= */

function renderStoreStatus() {

  const badge = el("store-status");

  const box = el("store-message");


  if (storeStatus === "open") {

    badge.textContent =
      "🟢 Aberto";

    box.classList.add(
      "hidden"
    );

  }


  else if (
    storeStatus === "paused"
  ) {

    badge.textContent =
      "🟡 Pausado";

    box.textContent =
      "Estamos com muitos pedidos no momento. Novos pedidos estão temporariamente pausados.";

    box.classList.remove(
      "hidden"
    );

  }


  else {

    badge.textContent =
      "🔴 Fechado";

    box.textContent =
      "Estamos fechados no momento. Você ainda pode consultar o cardápio.";

    box.classList.remove(
      "hidden"
    );

  }


  renderProducts();
}


/* =========================
   CATEGORIAS
========================= */

function renderCategories() {

  const visible =
    categoryOrder.filter(
      category =>
        products.some(
          product =>
            product.category === category &&
            product.active
        )
    );


  const categories = [
    "Todos",
    ...visible
  ];


  el("categories").innerHTML =
    categories
      .map(
        category => `
          <button
            class="category-btn ${
              activeCategory === category
                ? "active"
                : ""
            }"
            data-category="${category}"
          >
            ${category}
          </button>
        `
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


/* =========================
   PRODUTOS
========================= */

function renderProducts() {

  const sections =
    (
      activeCategory === "Todos"
        ? categoryOrder
        : [activeCategory]
    )
    .filter(
      category =>
        products.some(
          product =>
            product.category === category &&
            product.active
        )
    );


  el("menu").innerHTML =
    sections
      .map(
        category => {

          const items =
            products.filter(
              product =>
                product.category === category &&
                product.active
            );


          return `
            <section class="menu-section">

              <h2>
                ${category}
              </h2>


              <div class="product-grid">

                ${
                  items
                    .map(
                      product => `
                        <article class="product">

                          <div>

                            <h3>
                              ${product.name}
                            </h3>


                            ${
                              product.description
                                ? `
                                  <p>
                                    ${product.description}
                                  </p>
                                `
                                : ""
                            }


                            <div class="price">

                              ${money(
                                product.price
                              )}

                            </div>

                          </div>


                          <button
                            class="primary-btn"
                            data-add="${product.id}"
                            ${
                              storeStatus !== "open"
                                ? "disabled"
                                : ""
                            }
                          >
                            Adicionar
                          </button>

                        </article>
                      `
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
              (cart[id] || 0) + 1;

            renderCart();

          }
        );

      }
    );
}


/* =========================
   TAXA DO BAIRRO
========================= */

function selectedFee() {

  const mode =
    document.querySelector(
      'input[name="fulfillment"]:checked'
    )?.value || "delivery";


  if (
    mode === "pickup"
  ) {

    return 0;

  }


  const id =
    el("neighborhood").value;


  const neighborhood =
    neighborhoods.find(
      item =>
        String(item.id) ===
        String(id)
    );


  return neighborhood
    ? Number(neighborhood.fee)
    : 0;
}


/* =========================
   SUBTOTAL
========================= */

function subtotal() {

  return Object
    .entries(cart)
    .reduce(
      (
        sum,
        [id, quantity]
      ) => {

        const product =
          products.find(
            item =>
              String(item.id) ===
              String(id)
          );


        return sum +
          (
            product
              ? Number(product.price) *
                quantity
              : 0
          );

      },
      0
    );
}


/* =========================
   CARRINHO
========================= */

function renderCart() {

  const rows =
    Object
      .entries(cart)
      .filter(
        ([, quantity]) =>
          quantity > 0
      );


  let count = 0;


  el("cart-items").innerHTML =
    rows.length

      ? rows
          .map(
            (
              [id, quantity]
            ) => {

              const product =
                products.find(
                  item =>
                    String(item.id) ===
                    String(id)
                );


              if (!product) {

                return "";

              }


              count += quantity;


              return `
                <div class="cart-row">

                  <div>

                    <strong>
                      ${product.name}
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
                      data-minus="${id}"
                    >
                      −
                    </button>


                    <button
                      class="qty-btn"
                      data-plus="${id}"
                    >
                      +
                    </button>

                  </div>

                </div>
              `;

            }
          )
          .join("")

      : `
        <p>
          Seu carrinho está vazio.
        </p>
      `;


  el("cart-count").textContent =
    `${count} ${
      count === 1
        ? "item"
        : "itens"
    }`;


  const sub =
    subtotal();

  const fee =
    selectedFee();


  el("subtotal").textContent =
    money(sub);

  el("delivery-fee").textContent =
    money(fee);

  el("total").textContent =
    money(
      sub + fee
    );


  el("checkout-subtotal").textContent =
    money(sub);

  el("checkout-fee").textContent =
    money(fee);

  el("checkout-total").textContent =
    money(
      sub + fee
    );


  document
    .querySelectorAll(
      "[data-minus]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            cart[
              button.dataset.minus
            ] =
              Math.max(
                0,
                (
                  cart[
                    button.dataset.minus
                  ] || 0
                ) - 1
              );


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

            cart[
              button.dataset.plus
            ] =
              (
                cart[
                  button.dataset.plus
                ] || 0
              ) + 1;


            renderCart();

          }
        );

      }
    );
}


/* =========================
   CONTINUAR PEDIDO
========================= */

el("continue-btn")
  .addEventListener(
    "click",
    () => {

      if (
        storeStatus !== "open"
      ) {

        el(
          "cart-error"
        ).textContent =
          "A loja não está recebendo pedidos agora.";

        return;
      }


      if (
        subtotal() <= 0
      ) {

        el(
          "cart-error"
        ).textContent =
          "Adicione pelo menos um item.";

        return;
      }


      el(
        "cart-error"
      ).textContent =
        "";


      el(
        "checkout"
      ).classList.remove(
        "hidden"
      );


      el(
        "checkout"
      ).scrollIntoView(
        {
          behavior: "smooth",
          block: "start"
        }
      );

    }
  );


/* =========================
   DELIVERY OU RETIRADA
========================= */

document
  .querySelectorAll(
    'input[name="fulfillment"]'
  )
  .forEach(
    radio => {

      radio.addEventListener(
        "change",
        () => {

          const mode =
            document.querySelector(
              'input[name="fulfillment"]:checked'
            ).value;


          el(
            "delivery-fields"
          ).classList.toggle(
            "hidden",
            mode === "pickup"
          );


          renderCart();

        }
      );

    }
  );


/* =========================
   TROCAR BAIRRO
========================= */

el("neighborhood")
  .addEventListener(
    "change",
    renderCart
  );


/* =========================
   CONFIRMAR PEDIDO
========================= */

el("confirm-btn")
  .addEventListener(
    "click",
    async () => {

      const name =
        el(
          "customer-name"
        ).value.trim();


      const phone =
        el(
          "customer-phone"
        ).value.trim();


      const payment =
        el(
          "payment"
        ).value;


      const mode =
        document.querySelector(
          'input[name="fulfillment"]:checked'
        ).value;


      const neighborhoodId =
        el(
          "neighborhood"
        ).value;


      const street =
        el(
          "street"
        ).value.trim();


      const number =
        el(
          "number"
        ).value.trim();


      el(
        "checkout-error"
      ).textContent =
        "";


      if (
        !name ||
        !phone ||
        !payment
      ) {

        el(
          "checkout-error"
        ).textContent =
          "Preencha nome, WhatsApp e pagamento.";

        return;
      }


      if (
        mode === "delivery" &&
        (
          !neighborhoodId ||
          !street ||
          !number
        )
      ) {

        el(
          "checkout-error"
        ).textContent =
          "Preencha bairro, rua e número.";

        return;
      }


      if (
        storeStatus !== "open"
      ) {

        el(
          "checkout-error"
        ).textContent =
          "A loja não está recebendo pedidos agora.";

        return;
      }


      const items =
        Object
          .entries(cart)
          .filter(
            ([, quantity]) =>
              quantity > 0
          )
          .map(
            (
              [id, quantity]
            ) => {

              const product =
                products.find(
                  item =>
                    String(item.id) ===
                    String(id)
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


      const orderPayload = {

        customer_name:
          name,

        customer_phone:
          phone,

        fulfillment:
          mode,


        neighborhood_id:
          mode === "delivery"
            ? Number(
                neighborhoodId
              )
            : null,


        street:
          mode === "delivery"
            ? street
            : null,


        number:
          mode === "delivery"
            ? number
            : null,


        complement:
          mode === "delivery"
            ? el(
                "complement"
              ).value.trim()
            : null,


        payment_method:
          payment,


        notes:
          el(
            "notes"
          ).value.trim(),


        subtotal:
          subtotal(),


        delivery_fee:
          selectedFee(),


        total:
          subtotal() +
          selectedFee(),


        status:
          "received"

      };


      el(
        "confirm-btn"
      ).disabled =
        true;


      const {
        data: order,
        error
      } =
        await db
          .from(
            "orders"
          )
          .insert(
            orderPayload
          )
          .select()
          .single();


      if (error) {

        console.error(
          error
        );


        el(
          "confirm-btn"
        ).disabled =
          false;


        el(
          "checkout-error"
        ).textContent =
          "Não foi possível enviar o pedido. Tente novamente.";


        return;
      }


      const orderItems =
        items.map(
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
          .from(
            "order_items"
          )
          .insert(
            orderItems
          );


      if (itemsError) {

        console.error(
          itemsError
        );


        el(
          "confirm-btn"
        ).disabled =
          false;


        el(
          "checkout-error"
        ).textContent =
          "Pedido criado, mas houve erro ao registrar os itens.";


        return;
      }


      el(
        "checkout"
      ).classList.add(
        "hidden"
      );


      el(
        "success"
      ).classList.remove(
        "hidden"
      );


      el(
        "success-text"
      ).textContent =
        `Pedido #${order.id} recebido. Total: ${money(order.total)}.`;


      cart = {};


      renderCart();


      el(
        "confirm-btn"
      ).disabled =
        false;


      el(
        "success"
      ).scrollIntoView(
        {
          behavior: "smooth",
          block: "center"
        }
      );

    }
  );


/* =========================
   NOVO PEDIDO
========================= */

el("new-order-btn")
  .addEventListener(
    "click",
    () => {

      el(
        "success"
      ).classList.add(
        "hidden"
      );


      el(
        "customer-name"
      ).value =
        "";


      el(
        "customer-phone"
      ).value =
        "";


      el(
        "street"
      ).value =
        "";


      el(
        "number"
      ).value =
        "";


      el(
        "complement"
      ).value =
        "";


      el(
        "payment"
      ).value =
        "";


      el(
        "notes"
      ).value =
        "";


      el(
        "neighborhood"
      ).value =
        "";


      window.scrollTo(
        {
          top: 0,
          behavior: "smooth"
        }
      );

    }
  );


/* =========================
   INICIAR SITE
========================= */

Promise.all([
  loadStore(),
  loadProducts(),
  loadNeighborhoods()
]);
