document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("sendButton");

    button.addEventListener("click", async () => {
        const value1 = document.getElementById("input1").value;
        const value2 = document.getElementById("input2").value;

        // Find the active tab
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log(tab.id);

        // Inject code into the webpage’s context
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: async (val1, val2) => {
                const first = val1.trim();
                const second = val2.trim();
                if (!first || !second) {
                    console.warn('Both inputs must be filled.');
                    return;
                }

                try {
                    const response = await fetch(`/api/infinite-craft/pair?first=${first}&second=${second}`);
                    const data = await response.json();
                    console.log(data);

                    const dbName = "infinite-craft";
                    const storeName = "items";
                    const request = indexedDB.open(dbName, 1);

                    request.onupgradeneeded = function (event) {
                        const db = event.target.result;
                        let store;
                        if (!db.objectStoreNames.contains(storeName)) {
                            store = db.createObjectStore(storeName, { keyPath: "id" });
                        } else {
                            store = event.currentTarget.transaction.objectStore(storeName);
                        }
                        if (!store.indexNames.contains("saveId")) {
                            store.createIndex("saveId", "saveId", { unique: false });
                        }
                    };

                    request.onsuccess = function (event) {
                        const db = event.target.result;
                        const transaction = db.transaction(storeName, "readwrite");
                        const store = transaction.objectStore(storeName);

                        const countRequest = store.count();
                        countRequest.onsuccess = function () {
                            const id = countRequest.result + 1;
                            const item = {
                                id: id,
                                saveId: 0,
                                text: data.result,
                                emoji: data.emoji,
                                recipes: [[1, 2]]
                            };

                            const addRequest = store.put(item);
                            addRequest.onsuccess = function () {
                                console.log("Item added to IndexedDB:", item);
                                location.reload(); // Refresh the page after adding
                            };
                            addRequest.onerror = function () {
                                console.error("Error adding item:", addRequest.error);
                            };
                        };
                    };

                    request.onerror = function () {
                        console.error("Error opening database:", request.error);
                    };

                } catch (error) {
                    console.error('Error fetching data:', error);
                }
            },
            args: [value1, value2]
        });
    });
});
