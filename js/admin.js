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

const el = id => document.getElementById(id);

let products = [];
let neighborhoods = [];


/* =========================================================
   LOGIN E SESSÃO
========================================================= */

async function checkSession() {
  const {
    data: { session }
  } = await db.auth.getSession();

  if (session) {
    showAdminPanel();
  }
}


el("login-btn")
  .addEventListener("click", async () => {
    const email = el("email").value.trim();
    const password = el("password").value;

    el("login-error").textContent = "";

    if (!email || !password) {
      el("login-error").textContent =
        "Preencha e-mail e senha.";
      return;
    }

    el("login-btn").disabled = true;

    const {
      error
    } =
      await db.auth.signInWithPassword({
        email,
        password
      });

    el("login-btn").disabled = false;

    if (error) {
      console.error(error);

      el("login-error").textContent =
        "E-mail ou senha inválidos.";

      return;
    }

    showAdminPanel();
  });


el("logout-btn")
  .addEventListener("click", async () => {
    await db.auth.signOut();

    el("admin-panel")
      .classList
      .add("hidden");

    el("login-card")
      .classList
      .remove("hidden");
  });


async function showAdminPanel() {
  el("login-card")
    .classList
    .add("hidden");

  el("admin-panel")
    .classList
    .remove("hidden");

  await Promise.all([
    loadStore(),
    loadProducts(),
    loadNeighborhoods(),
    loadOrders()
  ]);
}


/* =========================================================
   STATUS DA LOJA
========================================================= */

async function loadStore() {
  const {
    data,
    error
  } =
    await db
      .from("store_settings")
      .select("*")
      .eq("id", 1)
      .single();

  if (error) {
    console.error(
      "Erro ao carregar status:",
      error
    );

    el("admin-store-text").textContent =
      "Erro ao carregar status.";

    return;
  }

  const labels = {
    open: "🟢 Loja aberta",
    paused: "🟡 Pedidos pausados",
    closed: "🔴 Loja fechada"
  };

  el("admin-store-text").textContent =
    labels[data.status] || data.status;
}


document
  .querySelectorAll("[data-store-status]")
  .forEach(button => {
    button.addEventListener(
      "click",
      async () => {
        const status =
          button.dataset.storeStatus;

        const {
          error
        } =
          await db
            .from("store_settings")
            .update({
              status,
              updated_at:
                new Date().toISOString()
            })
            .eq("id", 1);

        if (error) {
          console.error(error);

          alert(
            "Não foi possível alterar o status da loja."
          );

          return;
        }

        await loadStore();
      }
    );
  });


/* =========================================================
   PRODUTOS
========================================================= */

async function loadProducts() {
  const {
    data,
    error
  } =
    await db
      .from("products")
      .select("*")
      .order("sort_order");

  if (error) {
    console.error(
      "Erro ao carregar produtos:",
      error
    );

    el("admin-products").innerHTML =
      "<p>Erro ao carregar produtos.</p>";

    return;
  }

  products = data || [];

  renderProducts();
}


function renderProducts() {
  el("admin-products").innerHTML =
    categoryOrder
      .map(category => {
        const items =
          products.filter(
            product =>
              product.category === category
          );

        if (!items.length) {
          return "";
        }

        return `
          <div class="admin-category">

            <h3>${category}</h3>

            ${
              items
                .map(
                  product => `
                    <div class="admin-product">

                      <div>
                        <strong>
                          ${product.name}
                        </strong>

                        <br>

                        <small>
                          ${money(product.price)}
                        </small>
                      </div>

                      <label>
                        <input
                          type="checkbox"
                          data-product-toggle="${product.id}"
                          ${
                            product.active
                              ? "checked"
                              : ""
                          }
                        >
                        Disponível
                      </label>

                    </div>
                  `
                )
                .join("")
            }

          </div>
        `;
      })
      .join("");


  document
    .querySelectorAll(
      "[data-product-toggle]"
    )
    .forEach(input => {
      input.addEventListener(
        "change",
        async () => {
          const id =
            input.dataset.productToggle;

          const active =
            input.checked;

          const {
            error
          } =
            await db
              .from("products")
              .update({
                active
              })
              .eq("id", id);

          if (error) {
            console.error(error);

            input.checked =
              !active;

            alert(
              "Não foi possível alterar a disponibilidade do produto."
            );
          }
        }
      );
    });
}


/* =========================================================
   BAIRROS E TAXAS
========================================================= */

async function loadNeighborhoods() {
  const {
    data,
    error
  } =
    await db
      .from("neighborhoods")
      .select("*")
      .order("name");

  if (error) {
    console.error(
      "Erro ao carregar bairros:",
      error
    );

    el("admin-neighborhoods").innerHTML =
      "<p>Erro ao carregar bairros.</p>";

    return;
  }

  neighborhoods = data || [];

  renderNeighborhoods();
}


function renderNeighborhoods() {
  if (!neighborhoods.length) {
    el("admin-neighborhoods")
      .innerHTML =
      "<p>Nenhum bairro cadastrado.</p>";

    return;
  }

  el("admin-neighborhoods").innerHTML =
    neighborhoods
      .map(
        neighborhood => `
          <div class="admin-neighborhood">

            <div>
              <strong>
                ${neighborhood.name}
              </strong>

              <br>

              <small>
                ${money(neighborhood.fee)}
              </small>
            </div>

            <div class="order-actions">

              <button
                class="secondary-btn"
                data-neighborhood-toggle="${neighborhood.id}"
              >
                ${
                  neighborhood.active
                    ? "Desativar"
                    : "Ativar"
                }
              </button>

              <button
                class="secondary-btn"
                data-neighborhood-delete="${neighborhood.id}"
              >
                Excluir
              </button>

            </div>

          </div>
        `
      )
      .join("");


  document
    .querySelectorAll(
      "[data-neighborhood-toggle]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          const id =
            button.dataset
              .neighborhoodToggle;

          const neighborhood =
            neighborhoods.find(
              item =>
                String(item.id) ===
                String(id)
            );

          if (!neighborhood) {
            return;
          }

          const {
            error
          } =
            await db
              .from("neighborhoods")
              .update({
                active:
                  !neighborhood.active
              })
              .eq("id", id);

          if (error) {
            console.error(error);

            alert(
              "Não foi possível alterar o bairro."
            );

            return;
          }

          await loadNeighborhoods();
        }
      );
    });


  document
    .querySelectorAll(
      "[data-neighborhood-delete]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          const id =
            button.dataset
              .neighborhoodDelete;

          const confirmed =
            confirm(
              "Tem certeza que deseja excluir este bairro?"
            );

          if (!confirmed) {
            return;
          }

          const {
            error
          } =
            await db
              .from("neighborhoods")
              .delete()
              .eq("id", id);

          if (error) {
            console.error(error);

            alert(
              "Não foi possível excluir o bairro. Se ele já estiver vinculado a pedidos, apenas desative."
            );

            return;
          }

          await loadNeighborhoods();
        }
      );
    });
}


el("add-neighborhood-btn")
  .addEventListener(
    "click",
    async () => {
      const name =
        el("new-neighborhood")
          .value
          .trim();

      const fee =
        Number(
          el("new-fee").value
        );

      if (!name) {
        alert(
          "Digite o nome do bairro."
        );

        return;
      }

      if (
        Number.isNaN(fee) ||
        fee < 0
      ) {
        alert(
          "Digite uma taxa válida."
        );

        return;
      }

      const {
        error
      } =
        await db
          .from("neighborhoods")
          .insert({
            name,
            fee,
            active: true
          });

      if (error) {
        console.error(error);

        alert(
          "Não foi possível cadastrar o bairro. Confira se ele já existe."
        );

        return;
      }

      el("new-neighborhood").value =
        "";

      el("new-fee").value =
        "";

      await loadNeighborhoods();
    }
  );


/* =========================================================
   PEDIDOS
========================================================= */

async function loadOrders() {
  const {
    data,
    error
  } =
    await db
      .from("orders")
      .select(`
        *,
        neighborhood:neighborhoods(name),
        items:order_items(*)
      `)
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(100);

  if (error) {
    console.error(
      "Erro ao carregar pedidos:",
      error
    );

    el("orders").innerHTML =
      "<p>Erro ao carregar pedidos.</p>";

    return;
  }

  renderOrders(
    data || []
  );
}


function statusLabel(status) {
  const labels = {
    received: "Recebido",
    preparing: "Preparando",
    ready: "Pronto",
    delivering: "Saiu para entrega",
    completed: "Concluído",
    cancelled: "Cancelado"
  };

  return labels[status] || status;
}


function renderOrders(orders) {
  if (!orders.length) {
    el("orders").innerHTML =
      "<p>Nenhum pedido recebido ainda.</p>";

    return;
  }

  el("orders").innerHTML =
    orders
      .map(order => {
        const createdAt =
          new Date(
            order.created_at
          )
          .toLocaleString(
            "pt-BR"
          );

        const address =
          order.fulfillment ===
          "pickup"
            ? "Retirada"
            : `
              ${order.street || ""},
              ${order.number || ""}
              <br>
              ${
                order.neighborhood
                  ?.name || ""
              }
              ${
                order.complement
                  ? `<br>${order.complement}`
                  : ""
              }
            `;

        const items =
          (order.items || [])
            .map(
              item => `
                <div>
                  ${item.qty}x
                  ${item.name}
                </div>
              `
            )
            .join("");

        return `
          <div class="order-card">

            <div class="order-head">

              <div>
                <strong>
                  Pedido #${order.id}
                </strong>

                <br>

                <small>
                  ${createdAt}
                </small>
              </div>

              <span class="badge">
                ${statusLabel(order.status)}
              </span>

            </div>

            <p>
              <strong>
                ${order.customer_name}
              </strong>

              <br>

              ${order.customer_phone}
            </p>

            <p>
              ${address}
            </p>

            <p>
              <strong>Itens:</strong>
              <br>
              ${items}
            </p>

            ${
              order.notes
                ? `
                  <p>
                    <strong>
                      Observações:
                    </strong>
                    <br>
                    ${order.notes}
                  </p>
                `
                : ""
            }

            <p>
              Pagamento:
              <strong>
                ${order.payment_method}
              </strong>
            </p>

            <p>
              Total:
              <strong>
                ${money(order.total)}
              </strong>
            </p>

            <div class="order-actions">

              <button
                class="secondary-btn"
                data-order-status="preparing"
                data-order-id="${order.id}"
              >
                Preparando
              </button>

              <button
                class="secondary-btn"
                data-order-status="ready"
                data-order-id="${order.id}"
              >
                Pronto
              </button>

              ${
                order.fulfillment ===
                "delivery"
                  ? `
                    <button
                      class="secondary-btn"
                      data-order-status="delivering"
                      data-order-id="${order.id}"
                    >
                      Saiu para entrega
                    </button>
                  `
                  : ""
              }

              <button
                class="secondary-btn"
                data-order-status="completed"
                data-order-id="${order.id}"
              >
                Concluir
              </button>

              <button
                class="secondary-btn"
                data-order-status="cancelled"
                data-order-id="${order.id}"
              >
                Cancelar
              </button>

            </div>

          </div>
        `;
      })
      .join("");


  document
    .querySelectorAll(
      "[data-order-status]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          const orderId =
            button.dataset.orderId;

          const status =
            button.dataset.orderStatus;

          const {
            error
          } =
            await db
              .from("orders")
              .update({
                status
              })
              .eq(
                "id",
                orderId
              );

          if (error) {
            console.error(error);

            alert(
              "Não foi possível atualizar o pedido."
            );

            return;
          }

          await loadOrders();
        }
      );
    });
}


el("refresh-orders-btn")
  .addEventListener(
    "click",
    loadOrders
  );


/* Atualização automática dos pedidos */
setInterval(
  async () => {
    const {
      data: { session }
    } =
      await db.auth
        .getSession();

    if (session) {
      loadOrders();
    }
  },
  15000
);


/* =========================================================
   INICIAR
========================================================= */

checkSession();
