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
  }).format(Number(value) || 0);


const el = id =>
  document.getElementById(id);


const escapeHTML = value => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};


let products = [];
let neighborhoods = [];

let selectedImageFile = null;
let removeCurrentImage = false;


/* =========================================================
   LOGIN
========================================================= */

async function checkSession() {
  const {
    data: { session }
  } =
    await db.auth.getSession();

  if (session) {
    await showAdminPanel();
  }
}


el("login-btn")
  .addEventListener(
    "click",
    login
  );


el("password")
  .addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        login();
      }
    }
  );


async function login() {
  const email =
    el("email")
      .value
      .trim();

  const password =
    el("password")
      .value;

  el("login-error").textContent =
    "";

  if (!email || !password) {
    el("login-error").textContent =
      "Preencha e-mail e senha.";

    return;
  }

  el("login-btn").disabled =
    true;

  const {
    error
  } =
    await db.auth
      .signInWithPassword({
        email,
        password
      });

  el("login-btn").disabled =
    false;

  if (error) {
    console.error(error);

    el("login-error").textContent =
      "E-mail ou senha inválidos.";

    return;
  }

  await showAdminPanel();
}


el("logout-btn")
  .addEventListener(
    "click",
    async () => {
      await db.auth.signOut();

      el("admin-panel")
        .classList
        .add("hidden");

      el("login-card")
        .classList
        .remove("hidden");
    }
  );


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

    el("admin-store-text")
      .textContent =
      "Erro ao carregar status.";

    return;
  }

  const labels = {
    open:
      "🟢 Loja aberta e recebendo pedidos",

    paused:
      "🟡 Novos pedidos estão pausados",

    closed:
      "🔴 Loja fechada"
  };

  el("admin-store-text")
    .textContent =
    labels[data.status] ||
    data.status;
}


document
  .querySelectorAll(
    "[data-store-status]"
  )
  .forEach(button => {
    button.addEventListener(
      "click",
      async () => {
        const status =
          button.dataset
            .storeStatus;

        const {
          error
        } =
          await db
            .from("store_settings")
            .update({
              status,
              updated_at:
                new Date()
                  .toISOString()
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
      .order(
        "sort_order",
        {
          ascending: true
        }
      );

  if (error) {
    console.error(
      "Erro ao carregar produtos:",
      error
    );

    el("admin-products")
      .innerHTML =
      "<p>Erro ao carregar produtos.</p>";

    return;
  }

  products =
    data || [];

  renderProducts();
}


function renderProducts() {
  el("admin-products")
    .innerHTML =
    categoryOrder
      .map(category => {
        const items =
          products.filter(
            product =>
              product.category ===
              category
          );

        if (!items.length) {
          return "";
        }

        return `
          <div class="admin-category">

            <h3>
              ${escapeHTML(category)}
            </h3>

            ${
              items
                .map(
                  product => `
                    <div class="admin-product">

                      <div class="admin-product-info">

                        ${
                          product.image_url
                            ? `
                              <img
                                src="${escapeHTML(product.image_url)}"
                                alt="${escapeHTML(product.name)}"
                                class="admin-product-thumb"
                              >
                            `
                            : ""
                        }

                        <div>

                          <div class="admin-product-name">

                            <strong>
                              ${escapeHTML(product.name)}
                            </strong>

                            <span
                              class="product-status ${
                                product.active
                                  ? "product-active"
                                  : "product-inactive"
                              }"
                            >
                              ${
                                product.active
                                  ? "Disponível"
                                  : "Indisponível"
                              }
                            </span>

                          </div>

                          ${
                            product.description
                              ? `
                                <p class="admin-product-description">
                                  ${escapeHTML(product.description)}
                                </p>
                              `
                              : ""
                          }

                          <span class="admin-product-price">
                            ${money(product.price)}
                          </span>

                        </div>

                      </div>


                      <div class="admin-product-actions">

                        <button
                          class="secondary-btn"
                          data-product-edit="${product.id}"
                        >
                          ✏️ Editar
                        </button>

                        <button
                          class="secondary-btn"
                          data-product-toggle="${product.id}"
                        >
                          ${
                            product.active
                              ? "Desativar"
                              : "Ativar"
                          }
                        </button>

                        <button
                          class="danger-btn"
                          data-product-delete="${product.id}"
                        >
                          🗑️ Excluir
                        </button>

                      </div>

                    </div>
                  `
                )
                .join("")
            }

          </div>
        `;
      })
      .join("");

  bindProductButtons();
}


function bindProductButtons() {
  document
    .querySelectorAll(
      "[data-product-edit]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          openEditProduct(
            button.dataset
              .productEdit
          );
        }
      );
    });


  document
    .querySelectorAll(
      "[data-product-toggle]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          const id =
            button.dataset
              .productToggle;

          const product =
            products.find(
              item =>
                String(item.id) ===
                String(id)
            );

          if (!product) {
            return;
          }

          const {
            error
          } =
            await db
              .from("products")
              .update({
                active:
                  !product.active
              })
              .eq(
                "id",
                id
              );

          if (error) {
            console.error(error);

            alert(
              "Não foi possível alterar a disponibilidade do produto."
            );

            return;
          }

          await loadProducts();
        }
      );
    });


  document
    .querySelectorAll(
      "[data-product-delete]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          const id =
            button.dataset
              .productDelete;

          const product =
            products.find(
              item =>
                String(item.id) ===
                String(id)
            );

          if (!product) {
            return;
          }

          const confirmed =
            confirm(
              `Deseja realmente excluir "${product.name}"?`
            );

          if (!confirmed) {
            return;
          }

          if (product.image_url) {
            await deleteImageFromStorage(
              product.image_url
            );
          }

          const {
            error
          } =
            await db
              .from("products")
              .delete()
              .eq(
                "id",
                id
              );

          if (error) {
            console.error(error);

            alert(
              "Esse produto não pôde ser excluído. Se ele já estiver vinculado a um pedido antigo, apenas desative o produto."
            );

            return;
          }

          await loadProducts();
        }
      );
    });
}


/* =========================================================
   FOTO DO PRODUTO
========================================================= */

el("product-image")
  .addEventListener(
    "change",
    event => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];

      if (
        !allowedTypes.includes(
          file.type
        )
      ) {
        el("product-form-error")
          .textContent =
          "Use uma imagem JPG, PNG ou WebP.";

        el("product-image").value =
          "";

        return;
      }

      if (
        file.size >
        5 * 1024 * 1024
      ) {
        el("product-form-error")
          .textContent =
          "A imagem precisa ter no máximo 5 MB.";

        el("product-image").value =
          "";

        return;
      }

      el("product-form-error")
        .textContent =
        "";

      selectedImageFile =
        file;

      removeCurrentImage =
        false;

      const previewURL =
        URL.createObjectURL(
          file
        );

      showImagePreview(
        previewURL
      );
    }
  );


el("remove-product-image-btn")
  .addEventListener(
    "click",
    () => {
      selectedImageFile =
        null;

      el("product-image").value =
        "";

      removeCurrentImage =
        true;

      hideImagePreview();
    }
  );


function showImagePreview(url) {
  el("product-image-preview")
    .src =
    url;

  el("product-image-preview-box")
    .classList
    .remove("hidden");
}


function hideImagePreview() {
  el("product-image-preview")
    .src =
    "";

  el("product-image-preview-box")
    .classList
    .add("hidden");
}


async function uploadProductImage(
  file,
  productName
) {
  if (!file) {
    return null;
  }

  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();

  const safeName =
    productName
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  const fileName =
    `${Date.now()}-${safeName}.${extension}`;

  const {
    error
  } =
    await db.storage
      .from("product-images")
      .upload(
        fileName,
        file,
        {
          cacheControl:
            "3600",

          upsert:
            false
        }
      );

  if (error) {
    console.error(
      "Erro no upload:",
      error
    );

    throw new Error(
      "Não foi possível enviar a foto."
    );
  }

  const {
    data
  } =
    db.storage
      .from("product-images")
      .getPublicUrl(
        fileName
      );

  return data.publicUrl;
}


function getStoragePathFromURL(
  imageURL
) {
  if (!imageURL) {
    return null;
  }

  const marker =
    "/storage/v1/object/public/product-images/";

  const index =
    imageURL.indexOf(
      marker
    );

  if (index === -1) {
    return null;
  }

  return decodeURIComponent(
    imageURL.substring(
      index + marker.length
    )
  );
}


async function deleteImageFromStorage(
  imageURL
) {
  const path =
    getStoragePathFromURL(
      imageURL
    );

  if (!path) {
    return;
  }

  const {
    error
  } =
    await db.storage
      .from("product-images")
      .remove([
        path
      ]);

  if (error) {
    console.error(
      "Erro ao excluir imagem:",
      error
    );
  }
}


/* =========================================================
   NOVO PRODUTO
========================================================= */

el("new-product-btn")
  .addEventListener(
    "click",
    () => {
      resetProductForm();

      el("product-form-title")
        .textContent =
        "Novo produto";

      el("product-form")
        .classList
        .remove("hidden");

      el("product-form")
        .scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
    }
  );


function resetProductForm() {
  el("editing-product-id").value =
    "";

  el("editing-product-image-url")
    .value =
    "";

  el("product-category").value =
    "";

  el("product-name").value =
    "";

  el("product-description").value =
    "";

  el("product-price").value =
    "";

  el("product-image").value =
    "";

  el("product-form-error")
    .textContent =
    "";

  selectedImageFile =
    null;

  removeCurrentImage =
    false;

  hideImagePreview();
}


/* =========================================================
   EDITAR PRODUTO
========================================================= */

function openEditProduct(id) {
  const product =
    products.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!product) {
    return;
  }

  el("editing-product-id").value =
    product.id;

  el("editing-product-image-url")
    .value =
    product.image_url || "";

  el("product-category").value =
    product.category;

  el("product-name").value =
    product.name;

  el("product-description").value =
    product.description || "";

  el("product-price").value =
    Number(product.price)
      .toFixed(2);

  el("product-image").value =
    "";

  selectedImageFile =
    null;

  removeCurrentImage =
    false;

  if (product.image_url) {
    showImagePreview(
      product.image_url
    );
  } else {
    hideImagePreview();
  }

  el("product-form-title")
    .textContent =
    "Editar produto";

  el("product-form-error")
    .textContent =
    "";

  el("product-form")
    .classList
    .remove("hidden");

  el("product-form")
    .scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
}


/* =========================================================
   CANCELAR PRODUTO
========================================================= */

el("cancel-product-btn")
  .addEventListener(
    "click",
    () => {
      resetProductForm();

      el("product-form")
        .classList
        .add("hidden");
    }
  );


/* =========================================================
   SALVAR PRODUTO
========================================================= */

el("save-product-btn")
  .addEventListener(
    "click",
    async () => {
      const editingId =
        el("editing-product-id")
          .value;

      const currentImageURL =
        el("editing-product-image-url")
          .value;

      const category =
        el("product-category")
          .value;

      const name =
        el("product-name")
          .value
          .trim();

      const description =
        el("product-description")
          .value
          .trim();

      const price =
        Number(
          el("product-price")
            .value
        );

      el("product-form-error")
        .textContent =
        "";

      if (!category) {
        el("product-form-error")
          .textContent =
          "Selecione a categoria.";

        return;
      }

      if (!name) {
        el("product-form-error")
          .textContent =
          "Digite o nome do produto.";

        return;
      }

      if (
        Number.isNaN(price) ||
        price <= 0
      ) {
        el("product-form-error")
          .textContent =
          "Digite um preço válido.";

        return;
      }

      el("save-product-btn")
        .disabled =
        true;

      el("save-product-btn")
        .textContent =
        "Salvando...";

      try {
        let imageURL =
          currentImageURL || null;

        if (selectedImageFile) {
          const newImageURL =
            await uploadProductImage(
              selectedImageFile,
              name
            );

          if (
            currentImageURL &&
            newImageURL !==
              currentImageURL
          ) {
            await deleteImageFromStorage(
              currentImageURL
            );
          }

          imageURL =
            newImageURL;
        }

        if (
          removeCurrentImage &&
          currentImageURL
        ) {
          await deleteImageFromStorage(
            currentImageURL
          );

          imageURL =
            null;
        }

        if (editingId) {
          await updateProduct({
            editingId,
            category,
            name,
            description,
            price,
            imageURL
          });
        } else {
          await createProduct({
            category,
            name,
            description,
            price,
            imageURL
          });
        }

      } catch (error) {
        console.error(error);

        el("product-form-error")
          .textContent =
          error.message ||
          "Não foi possível salvar o produto.";

      } finally {
        el("save-product-btn")
          .disabled =
          false;

        el("save-product-btn")
          .textContent =
          "Salvar produto";
      }
    }
  );


async function createProduct({
  category,
  name,
  description,
  price,
  imageURL
}) {
  const productsInCategory =
    products.filter(
      product =>
        product.category ===
        category
    );

  const maxSort =
    productsInCategory.length
      ? Math.max(
          ...productsInCategory
            .map(
              product =>
                Number(
                  product.sort_order
                ) || 0
            )
        )
      : categoryBaseSort(
          category
        );

  const sortOrder =
    maxSort + 10;

  const {
    error
  } =
    await db
      .from("products")
      .insert({
        category,
        name,
        description:
          description || null,
        price,
        image_url:
          imageURL,
        active:
          true,
        sort_order:
          sortOrder
      });

  if (error) {
    console.error(error);

    if (
      error.code ===
      "23505"
    ) {
      throw new Error(
        "Já existe um produto com esse nome."
      );
    }

    throw new Error(
      "Não foi possível cadastrar o produto."
    );
  }

  resetProductForm();

  el("product-form")
    .classList
    .add("hidden");

  await loadProducts();

  alert(
    "Produto cadastrado com sucesso!"
  );
}


async function updateProduct({
  editingId,
  category,
  name,
  description,
  price,
  imageURL
}) {
  const oldProduct =
    products.find(
      item =>
        String(item.id) ===
        String(editingId)
    );

  let sortOrder =
    oldProduct
      ? oldProduct.sort_order
      : 0;

  if (
    oldProduct &&
    oldProduct.category !==
      category
  ) {
    const productsInCategory =
      products.filter(
        product =>
          product.category ===
          category
      );

    const maxSort =
      productsInCategory.length
        ? Math.max(
            ...productsInCategory
              .map(
                product =>
                  Number(
                    product.sort_order
                  ) || 0
              )
          )
        : categoryBaseSort(
            category
          );

    sortOrder =
      maxSort + 10;
  }

  const {
    error
  } =
    await db
      .from("products")
      .update({
        category,
        name,
        description:
          description || null,
        price,
        image_url:
          imageURL,
        sort_order:
          sortOrder
      })
      .eq(
        "id",
        editingId
      );

  if (error) {
    console.error(error);

    if (
      error.code ===
      "23505"
    ) {
      throw new Error(
        "Já existe outro produto com esse nome."
      );
    }

    throw new Error(
      "Não foi possível editar o produto."
    );
  }

  resetProductForm();

  el("product-form")
    .classList
    .add("hidden");

  await loadProducts();

  alert(
    "Produto atualizado com sucesso!"
  );
}


function categoryBaseSort(category) {
  const bases = {
    "Cachorro-quente": 0,
    "Pastéis": 100,
    "Caldos": 200,
    "Porções": 300
  };

  return bases[category] || 0;
}


/* =========================================================
   BAIRROS
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

    el("admin-neighborhoods")
      .innerHTML =
      "<p>Erro ao carregar bairros.</p>";

    return;
  }

  neighborhoods =
    data || [];

  renderNeighborhoods();
}


function renderNeighborhoods() {
  if (!neighborhoods.length) {
    el("admin-neighborhoods")
      .innerHTML =
      "<p>Nenhum bairro cadastrado.</p>";

    return;
  }

  el("admin-neighborhoods")
    .innerHTML =
    neighborhoods
      .map(
        neighborhood => `
          <div class="admin-neighborhood">

            <div>

              <strong>
                ${escapeHTML(neighborhood.name)}
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
                class="danger-btn"
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
              .eq(
                "id",
                id
              );

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
              .eq(
                "id",
                id
              );

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
          el("new-fee")
            .value
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

      el("new-neighborhood")
        .value =
        "";

      el("new-fee")
        .value =
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

    el("orders")
      .innerHTML =
      "<p>Erro ao carregar pedidos.</p>";

    return;
  }

  renderOrders(
    data || []
  );
}


function statusLabel(status) {
  const labels = {
    received:
      "Recebido",

    preparing:
      "Preparando",

    ready:
      "Pronto",

    delivering:
      "Saiu para entrega",

    completed:
      "Concluído",

    cancelled:
      "Cancelado"
  };

  return labels[status] ||
    status;
}


function renderOrders(orders) {
  if (!orders.length) {
    el("orders")
      .innerHTML =
      "<p>Nenhum pedido recebido ainda.</p>";

    return;
  }

  el("orders")
    .innerHTML =
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
            ? "Retirada no local"
            : `
              ${escapeHTML(order.street || "")},
              ${escapeHTML(order.number || "")}

              <br>

              ${
                escapeHTML(
                  order.neighborhood
                    ?.name || ""
                )
              }

              ${
                order.complement
                  ? `
                    <br>
                    ${escapeHTML(order.complement)}
                  `
                  : ""
              }
            `;

        const items =
          (order.items || [])
            .map(
              item => `
                <div>
                  ${Number(item.qty)}x
                  ${escapeHTML(item.name)}
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
                ${escapeHTML(order.customer_name)}
              </strong>

              <br>

              ${escapeHTML(order.customer_phone)}

            </p>


            <p>
              ${address}
            </p>


            <p>

              <strong>
                Itens:
              </strong>

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

                    ${escapeHTML(order.notes)}

                  </p>
                `
                : ""
            }


            <p>

              Pagamento:

              <strong>
                ${escapeHTML(order.payment_method)}
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
                class="danger-btn"
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
            button.dataset
              .orderId;

          const status =
            button.dataset
              .orderStatus;

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


/* =========================================================
   ATUALIZAÇÃO AUTOMÁTICA
========================================================= */

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
