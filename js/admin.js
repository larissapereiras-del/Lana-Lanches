/* =========================================================
   CONFIGURAÇÕES GERAIS
========================================================= */

const money = value =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value) || 0);


const el = id =>
  document.getElementById(id);


const escapeHTML = value => {
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
};


let categories = [];
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

      if (
        event.key === "Enter"
      ) {
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

  el("login-error")
    .textContent =
    "";

  if (
    !email ||
    !password
  ) {

    el("login-error")
      .textContent =
      "Preencha e-mail e senha.";

    return;
  }


  el("login-btn")
    .disabled =
    true;


  const {
    error
  } =
    await db.auth
      .signInWithPassword({
        email,
        password
      });


  el("login-btn")
    .disabled =
    false;


  if (error) {

    console.error(error);

    el("login-error")
      .textContent =
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


  /*
    Primeiro carregamos categorias e produtos.
    Assim o cardápio já consegue ser montado
    na ordem correta.
  */

  await loadCategories();

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
   CATEGORIAS
========================================================= */

async function loadCategories() {

  const {
    data,
    error
  } =
    await db
      .from("categories")
      .select("*")
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

    console.error(
      "Erro ao carregar categorias:",
      error
    );

    el("admin-categories")
      .innerHTML =
      "<p>Erro ao carregar categorias.</p>";

    return;
  }


  categories =
    data || [];


  renderCategories();

  renderProductCategoryOptions();
}


/* =========================================================
   EXIBIR CATEGORIAS
========================================================= */

function renderCategories() {

  if (!categories.length) {

    el("admin-categories")
      .innerHTML =
      "<p>Nenhuma categoria cadastrada.</p>";

    return;
  }


  el("admin-categories")
    .innerHTML =
    categories
      .map(category => {

        const productCount =
          products.filter(
            product =>
              product.category ===
              category.name
          ).length;


        return `
          <div class="admin-neighborhood">

            <div>

              <strong>
                ${escapeHTML(category.name)}
              </strong>

              <br>

              <small>
                Ordem: ${Number(category.sort_order)}
                •
                ${
                  category.active
                    ? "Ativa"
                    : "Inativa"
                }
                ${
                  productCount
                    ? ` • ${productCount} ${
                        productCount === 1
                          ? "produto"
                          : "produtos"
                      }`
                    : ""
                }
              </small>

            </div>


            <div class="order-actions">

              <button
                class="secondary-btn"
                data-category-edit="${category.id}"
              >
                ✏️ Editar
              </button>


              <button
                class="secondary-btn"
                data-category-toggle="${category.id}"
              >
                ${
                  category.active
                    ? "Desativar"
                    : "Ativar"
                }
              </button>


              <button
                class="danger-btn"
                data-category-delete="${category.id}"
              >
                🗑️ Excluir
              </button>

            </div>

          </div>
        `;
      })
      .join("");


  bindCategoryButtons();
}


/* =========================================================
   BOTÕES DAS CATEGORIAS
========================================================= */

function bindCategoryButtons() {

  document
    .querySelectorAll(
      "[data-category-edit]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openEditCategory(
            button.dataset
              .categoryEdit
          );
        }
      );
    });


  document
    .querySelectorAll(
      "[data-category-toggle]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const id =
            button.dataset
              .categoryToggle;


          const category =
            categories.find(
              item =>
                String(item.id) ===
                String(id)
            );


          if (!category) {
            return;
          }


          const {
            error
          } =
            await db
              .from("categories")
              .update({
                active:
                  !category.active
              })
              .eq(
                "id",
                id
              );


          if (error) {

            console.error(error);

            alert(
              "Não foi possível alterar a categoria."
            );

            return;
          }


          await loadCategories();

          renderProducts();
        }
      );
    });


  document
    .querySelectorAll(
      "[data-category-delete]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const id =
            button.dataset
              .categoryDelete;


          const category =
            categories.find(
              item =>
                String(item.id) ===
                String(id)
            );


          if (!category) {
            return;
          }


          const linkedProducts =
            products.filter(
              product =>
                product.category ===
                category.name
            );


          if (linkedProducts.length) {

            alert(
              `A categoria "${category.name}" possui ${linkedProducts.length} ${
                linkedProducts.length === 1
                  ? "produto cadastrado"
                  : "produtos cadastrados"
              }. Para não perder a organização do cardápio, mova esses produtos para outra categoria ou apenas desative a categoria.`
            );

            return;
          }


          const confirmed =
            confirm(
              `Deseja realmente excluir a categoria "${category.name}"?`
            );


          if (!confirmed) {
            return;
          }


          const {
            error
          } =
            await db
              .from("categories")
              .delete()
              .eq(
                "id",
                id
              );


          if (error) {

            console.error(error);

            alert(
              "Não foi possível excluir a categoria."
            );

            return;
          }


          await loadCategories();
        }
      );
    });
}


/* =========================================================
   NOVA CATEGORIA
========================================================= */

el("new-category-btn")
  .addEventListener(
    "click",
    () => {

      resetCategoryForm();


      el("category-form-title")
        .textContent =
        "Nova categoria";


      /*
        Coloca automaticamente o próximo
        número de ordem.
      */

      const maxOrder =
        categories.length
          ? Math.max(
              ...categories.map(
                category =>
                  Number(
                    category.sort_order
                  ) || 0
              )
            )
          : 0;


      el("category-sort-order")
        .value =
        maxOrder + 10;


      el("category-form")
        .classList
        .remove("hidden");


      el("category-form")
        .scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
    }
  );


/* =========================================================
   EDITAR CATEGORIA
========================================================= */

function openEditCategory(id) {

  const category =
    categories.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!category) {
    return;
  }


  el("editing-category-id")
    .value =
    category.id;


  el("category-name")
    .value =
    category.name;


  el("category-sort-order")
    .value =
    category.sort_order;


  el("category-form-title")
    .textContent =
    "Editar categoria";


  el("category-form-error")
    .textContent =
    "";


  el("category-form")
    .classList
    .remove("hidden");


  el("category-form")
    .scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
}


/* =========================================================
   RESET CATEGORIA
========================================================= */

function resetCategoryForm() {

  el("editing-category-id")
    .value =
    "";


  el("category-name")
    .value =
    "";


  el("category-sort-order")
    .value =
    "";


  el("category-form-error")
    .textContent =
    "";
}


/* =========================================================
   CANCELAR CATEGORIA
========================================================= */

el("cancel-category-btn")
  .addEventListener(
    "click",
    () => {

      resetCategoryForm();

      el("category-form")
        .classList
        .add("hidden");
    }
  );


/* =========================================================
   SALVAR CATEGORIA
========================================================= */

el("save-category-btn")
  .addEventListener(
    "click",
    async () => {

      const editingId =
        el("editing-category-id")
          .value;


      const name =
        el("category-name")
          .value
          .trim();


      const sortOrder =
        Number(
          el("category-sort-order")
            .value
        );


      el("category-form-error")
        .textContent =
        "";


      if (!name) {

        el("category-form-error")
          .textContent =
          "Digite o nome da categoria.";

        return;
      }


      if (
        Number.isNaN(sortOrder) ||
        sortOrder < 0
      ) {

        el("category-form-error")
          .textContent =
          "Digite uma ordem válida.";

        return;
      }


      el("save-category-btn")
        .disabled =
        true;


      el("save-category-btn")
        .textContent =
        "Salvando...";


      try {

        if (editingId) {

          await updateCategory(
            editingId,
            name,
            sortOrder
          );

        } else {

          await createCategory(
            name,
            sortOrder
          );
        }

      } catch (error) {

        console.error(error);

        el("category-form-error")
          .textContent =
          error.message ||
          "Não foi possível salvar a categoria.";

      } finally {

        el("save-category-btn")
          .disabled =
          false;


        el("save-category-btn")
          .textContent =
          "Salvar categoria";
      }
    }
  );


/* =========================================================
   CRIAR CATEGORIA
========================================================= */

async function createCategory(
  name,
  sortOrder
) {

  const {
    error
  } =
    await db
      .from("categories")
      .insert({
        name,
        active: true,
        sort_order:
          sortOrder
      });


  if (error) {

    console.error(error);

    if (
      error.code === "23505"
    ) {

      throw new Error(
        "Essa categoria já existe."
      );
    }


    throw new Error(
      "Não foi possível cadastrar a categoria."
    );
  }


  resetCategoryForm();


  el("category-form")
    .classList
    .add("hidden");


  await loadCategories();


  alert(
    "Categoria cadastrada com sucesso!"
  );
}


/* =========================================================
   ATUALIZAR CATEGORIA
========================================================= */

async function updateCategory(
  id,
  name,
  sortOrder
) {

  const oldCategory =
    categories.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!oldCategory) {

    throw new Error(
      "Categoria não encontrada."
    );
  }


  const oldName =
    oldCategory.name;


  /*
    Primeiro atualizamos a categoria.
  */

  const {
    error: categoryError
  } =
    await db
      .from("categories")
      .update({
        name,
        sort_order:
          sortOrder
      })
      .eq(
        "id",
        id
      );


  if (categoryError) {

    console.error(
      categoryError
    );


    if (
      categoryError.code ===
      "23505"
    ) {

      throw new Error(
        "Já existe uma categoria com esse nome."
      );
    }


    throw new Error(
      "Não foi possível editar a categoria."
    );
  }


  /*
    Se o nome mudou, atualizamos também
    os produtos que pertenciam à categoria antiga.
  */

  if (
    oldName !== name
  ) {

    const {
      error: productsError
    } =
      await db
        .from("products")
        .update({
          category: name
        })
        .eq(
          "category",
          oldName
        );


    if (productsError) {

      console.error(
        productsError
      );

      throw new Error(
        "A categoria foi alterada, mas houve um problema ao atualizar os produtos vinculados."
      );
    }
  }


  resetCategoryForm();


  el("category-form")
    .classList
    .add("hidden");


  await loadCategories();

  await loadProducts();


  alert(
    "Categoria atualizada com sucesso!"
  );
}


/* =========================================================
   OPÇÕES DE CATEGORIA NO PRODUTO
========================================================= */

function renderProductCategoryOptions(
  selectedValue = ""
) {

  const select =
    el("product-category");


  if (!select) {
    return;
  }


  select.innerHTML =
    `
      <option value="">
        Selecione
      </option>
    ` +
    categories
      .map(category => `
        <option
          value="${escapeHTML(category.name)}"
          ${
            selectedValue === category.name
              ? "selected"
              : ""
          }
        >
          ${escapeHTML(category.name)}
          ${
            category.active
              ? ""
              : " (inativa)"
          }
        </option>
      `)
      .join("");
}


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

  renderCategories();
}


/* =========================================================
   EXIBIR PRODUTOS
========================================================= */

function renderProducts() {

  /*
    Primeiro categorias cadastradas.
  */

  const orderedCategoryNames =
    categories.map(
      category =>
        category.name
    );


  /*
    Se existir algum produto antigo com uma
    categoria que não esteja na tabela categories,
    ele também continuará aparecendo no Admin.
  */

  const orphanCategories =
    [
      ...new Set(
        products
          .map(
            product =>
              product.category
          )
          .filter(
            category =>
              !orderedCategoryNames
                .includes(category)
          )
      )
    ];


  const allCategoryNames =
    [
      ...orderedCategoryNames,
      ...orphanCategories
    ];


  if (!products.length) {

    el("admin-products")
      .innerHTML =
      "<p>Nenhum produto cadastrado.</p>";

    return;
  }


  el("admin-products")
    .innerHTML =
    allCategoryNames
      .map(categoryName => {

        const items =
          products.filter(
            product =>
              product.category ===
              categoryName
          );


        if (!items.length) {
          return "";
        }


        const category =
          categories.find(
            item =>
              item.name ===
              categoryName
          );


        return `
          <div class="admin-category">

            <h3>
              ${escapeHTML(categoryName)}

              ${
                category &&
                !category.active
                  ? `
                    <span class="product-status product-inactive">
                      Categoria inativa
                    </span>
                  `
                  : ""
              }

            </h3>


            ${
              items
                .map(product => `
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
                `)
                .join("")
            }

          </div>
        `;
      })
      .join("");


  bindProductButtons();
}


/* =========================================================
   BOTÕES DOS PRODUTOS
========================================================= */

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


          /*
            Primeiro tentamos excluir o produto.
            Só apagamos a foto depois.
          */

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


          if (product.image_url) {

            await deleteImageFromStorage(
              product.image_url
            );
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
        event.target
          .files?.[0];


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


        el("product-image")
          .value =
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


        el("product-image")
          .value =
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


      el("product-image")
        .value =
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


/* =========================================================
   UPLOAD DA FOTO
========================================================= */

async function uploadProductImage(
  file,
  productName
) {

  if (!file) {
    return null;
  }


  const extensionMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };


  const extension =
    extensionMap[file.type];


  if (!extension) {

    throw new Error(
      "Formato de imagem inválido."
    );
  }


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


  const unique =
    typeof crypto !==
      "undefined" &&
    crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;


  const fileName =
    `products/${unique}-${safeName}.${extension}`;


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
            false,

          contentType:
            file.type
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


/* =========================================================
   CAMINHO DA FOTO NO STORAGE
========================================================= */

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


  if (
    index === -1
  ) {
    return null;
  }


  return decodeURIComponent(
    imageURL.substring(
      index +
      marker.length
    )
  );
}


/* =========================================================
   EXCLUIR FOTO
========================================================= */

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


      renderProductCategoryOptions();


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


/* =========================================================
   RESET PRODUTO
========================================================= */

function resetProductForm() {

  el("editing-product-id")
    .value =
    "";


  el("editing-product-image-url")
    .value =
    "";


  el("product-category")
    .value =
    "";


  el("product-name")
    .value =
    "";


  el("product-description")
    .value =
    "";


  el("product-price")
    .value =
    "";


  el("product-image")
    .value =
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


  el("editing-product-id")
    .value =
    product.id;


  el("editing-product-image-url")
    .value =
    product.image_url || "";


  renderProductCategoryOptions(
    product.category
  );


  el("product-name")
    .value =
    product.name;


  el("product-description")
    .value =
    product.description || "";


  el("product-price")
    .value =
    Number(
      product.price
    ).toFixed(2);


  el("product-image")
    .value =
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


      let newUploadedImageURL =
        null;


      try {

        /*
          Se o usuário escolheu uma foto nova,
          fazemos upload antes de atualizar o banco.
        */

        if (selectedImageFile) {

          newUploadedImageURL =
            await uploadProductImage(
              selectedImageFile,
              name
            );
        }


        let finalImageURL =
          currentImageURL || null;


        if (newUploadedImageURL) {

          finalImageURL =
            newUploadedImageURL;
        }


        if (removeCurrentImage) {

          finalImageURL =
            null;
        }


        if (editingId) {

          await updateProduct({
            editingId,
            category,
            name,
            description,
            price,
            imageURL:
              finalImageURL
          });


          /*
            Só depois do banco ter sido atualizado
            apagamos a imagem antiga.
          */

          if (
            currentImageURL &&
            (
              newUploadedImageURL ||
              removeCurrentImage
            )
          ) {

            await deleteImageFromStorage(
              currentImageURL
            );
          }

        } else {

          await createProduct({
            category,
            name,
            description,
            price,
            imageURL:
              finalImageURL
          });
        }


        resetProductForm();


        el("product-form")
          .classList
          .add("hidden");


        await loadProducts();


        alert(
          editingId
            ? "Produto atualizado com sucesso!"
            : "Produto cadastrado com sucesso!"
        );

      } catch (error) {

        console.error(error);


        /*
          Se subimos uma imagem nova mas o produto
          não foi salvo, removemos a imagem recém-enviada.
        */

        if (newUploadedImageURL) {

          await deleteImageFromStorage(
            newUploadedImageURL
          );
        }


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


/* =========================================================
   CRIAR PRODUTO
========================================================= */

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
      : 0;


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
}


/* =========================================================
   ATUALIZAR PRODUTO
========================================================= */

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
      ? Number(
          oldProduct.sort_order
        ) || 0
      : 0;


  /*
    Se ele mudou de categoria,
    vai para o final da nova categoria.
  */

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
        : 0;


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


/* =========================================================
   EXIBIR BAIRROS
========================================================= */

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
      .map(neighborhood => `
        <div class="admin-neighborhood">

          <div>

            <strong>
              ${escapeHTML(neighborhood.name)}
            </strong>

            <br>

            <small>
              ${money(neighborhood.fee)}
              •
              ${
                neighborhood.active
                  ? "Ativo"
                  : "Inativo"
              }
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
      `)
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


/* =========================================================
   ADICIONAR BAIRRO
========================================================= */

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


/* =========================================================
   STATUS DO PEDIDO
========================================================= */

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


/* =========================================================
   EXIBIR PEDIDOS
========================================================= */

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

              ${escapeHTML(
                order.neighborhood
                  ?.name || ""
              )}

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
            .map(item => `
              <div>
                ${Number(item.qty)}x
                ${escapeHTML(item.name)}
              </div>
            `)
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


/* =========================================================
   ATUALIZAR PEDIDOS
========================================================= */

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
