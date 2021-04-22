let db;
let budgetVersion;

const request = indexedDB.open("BudgetDB", budgetVersion || 21);

request.onupgradeneeded = function (e) {
  console.log("IndexDB upgrade needed");

  const { oldVersion } = e;
  const newVersion = e.newVersion || db.version;

  console.log(`DB updated version ${oldVersion} to ${newVersion}`);

  db = e.target.result;

  if (db.objectStoreNames.length === 0) {
    db.createObjectStore("BudgetStore", { autoIncrement: true });
  }
};

request.onerror = function (e) {
  console.log(`Woops! ${e.target.errorCode}`);
};

//Debug to work offline
async function getValues() {
  let transaction = db.transaction(["BudgetStore"], "readwrite");
  const store = transaction.objectStore("BudgetStore");
  const getAll = await store.getAll();
  let data;
  getAll.onsuccess = function () {
    data = getAll.result;
  };
  if (data) return data;
}
function checkDatabase() {
  console.log("DB invocation check");

  // Open transaction on BudgetStore
  let transaction = db.transaction(["BudgetStore"], "readwrite");

  // Access BudgetStore object
  const store = transaction.objectStore("BudgetStore");

  // GetAll
  const getAll = store.getAll();

  getAll.onsuccess = function () {
    // If items exist, bulk add when back online
    if (getAll.result.length > 0) {
      fetch("api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((res) => {
          if (res.length !== 0) {
            // Open new transaction
            transaction = db.transaction(["BudgetStore"], "readwrite");

            const currentStore = transaction.objectStore("BudgetStore");

            // Clear because bulk add was successful
            currentStore.clear();
            console.log("Store cleared.");
          }
        });
    }
  };
}

request.onsuccess = function (e) {
  console.log("Success!");
  db = e.target.result;

  // Check if app is online before reading from db
  if (navigator.onLine) {
    console.log("Backend online!");
    checkDatabase();
  }
};

const saveRecord = (record) => {
  console.log("Save record invoked");
  // Create a transaction on the BudgetStore db with readwrite access
  const transaction = db.transaction(["BudgetStore"], "readwrite");

  // Access your BudgetStore object store
  const store = transaction.objectStore("BudgetStore");

  // Add record to your store with add method.
  store.add(record);
};

// Listen for app coming back online
window.addEventListener("online", checkDatabase);
