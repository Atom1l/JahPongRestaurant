// --- Global Variables ---
let cart = [];
let currentSelectedItem = null;
let currentTableId = null;
let currentTableNumber = null;
let selectedPaymentMethod = "Cash";
let isEditMode = false; // ⭐️ ตัวแปรสำหรับ "โหมดแก้ไข"

// รอให้หน้าเว็บโหลดเสร็จ
document.addEventListener("DOMContentLoaded", () => {
  
  // --- 1. ตรวจสอบว่า User ล็อกอินมารึยัง ---
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log("User is logged in:", user.uid);
      fetchTables();
    } else {
      console.log("User is not logged in. Redirecting to login.");
      window.location.href = "login.html"; 
    }
  });

  // --- 2. ⭐️ (ฉบับสมบูรณ์) ดึงองค์ประกอบ HTML ---
  const tableSelectionContainer = document.getElementById("table-selection-container");
  const menuContainer = document.getElementById("menu-container");
  const checkoutContainer = document.getElementById("checkout-container");
  const successContainer = document.getElementById("success-container");

  // (Table)
  const tableGridContainer = document.getElementById("table-grid-container");
  const selectButton = document.getElementById("select-table-button");
  const editTablesButton = document.getElementById("edit-tables-button"); // ⭐️ (ปุ่ม Edit)

  // (Menu)
  const menuGridContainer = document.getElementById("menu-grid-container");
  const cartCountEl = document.getElementById("cart-count");
  const cartIcon = document.getElementById("cart-icon");

  // (Checkout)
  const checkoutBackButton = document.getElementById("checkout-back-button");
  const checkoutList = document.getElementById("checkout-list");
  const summarySubtotal = document.getElementById("summary-subtotal");
  const summaryTotal = document.getElementById("summary-total");
  const confirmTotalPrice = document.getElementById("confirm-total-price");
  const confirmOrderButton = document.getElementById("confirm-order-button");
  const paymentOptions = document.querySelectorAll(".payment-option");

  // (Modal - ราคาพิเศษ)
  const itemModal = document.getElementById("item-modal");
  const modalCloseButton = document.getElementById("modal-close-button");
  const addToCartButton = document.getElementById("add-to-cart-button");
  const modalItemName = document.getElementById("modal-item-name");
  const modalItemImage = document.getElementById("modal-item-image");
  const modalNotes = document.getElementById("modal-notes");
  const modalItemPriceDisplay = document.getElementById("modal-item-price-display");
  const modalPriceOptions = document.getElementById("modal-price-options");
  const modalBtnNormal = document.getElementById("modal-btn-normal");
  const modalBtnSpecial = document.getElementById("modal-btn-special");
  

  // --- 3. ฟังก์ชันดึงข้อมูลโต๊ะ ---
  function fetchTables() {
    db.collection("tables").orderBy("number").onSnapshot(
      (querySnapshot) => {
        tableGridContainer.innerHTML = ""; 
        querySnapshot.forEach((doc) => {
          createTableElement(doc.id, doc.data());
        });
      }, (error) => {
        console.error("Error getting tables: ", error);
      }
    );
  }

  // --- 4. ⭐️ (แก้ไข Bug!) ฟังก์ชันสร้าง UI โต๊ะ 1 ตัว ⭐️ ---
  function createTableElement(docId, tableData) {
    const tableDiv = document.createElement("div");
    tableDiv.className = "table-item";
    tableDiv.dataset.id = docId;
    tableDiv.dataset.status = tableData.status;

    // ⭐️ (แก้ไข) ใช้ไอคอนให้ถูกต้อง ⭐️
    let iconUrl = (tableData.status === "Available") 
      ? "../images/table-available.png" // รูปโต๊ะว่าง
      : "../images/table-available.png"; // 👈 (แก้ไข) รูปโต๊ะเต็ม

    tableDiv.innerHTML = `
      <img src="${iconUrl}" alt="โต๊ะ">
      <div style="">โต๊ะที่ ${tableData.number}</div>
      <input type="radio" name="table_selection" value="${docId}" style="display: none;">
    `;

    // 5. (อัปเดต) เพิ่ม Event Listener ให้โต๊ะ (เมื่อถูกคลิก)
    tableDiv.addEventListener("click", () => {
      
      if (isEditMode) {
        // --- (ใหม่!) ถ้าอยู่ใน "โหมดแก้ไข" ---
        handleTableEdit(docId, tableData);
      } else {
        // --- (ของเดิม) ถ้าอยู่ใน "โหมดสั่งอาหาร" ---
        if (tableData.status === "Occupied") return; // คลิกโต๊ะเต็มไม่ได้

        document.querySelectorAll('.table-item.selected').forEach(el => {
          el.classList.remove('selected');
        });
        tableDiv.classList.add('selected');
        
        currentTableId = docId;
        currentTableNumber = tableData.number;
        console.log(`Selected table: ${currentTableNumber} (ID: ${currentTableId})`);
      }
    });
    tableGridContainer.appendChild(tableDiv);
  }


  // --- 6. ปุ่ม "เลือก" โต๊ะ ---
  selectButton.addEventListener("click", () => {
    if (currentTableId) {
      tableSelectionContainer.style.display = "none";
      menuContainer.style.display = "block";

      cartIcon.style.display = "block";
      checkoutBackButton.style.display = "block";

      fetchMenuItems(); 
    } else {
      alert("กรุณาเลือกโต๊ะก่อนครับ");
    }
  });

  // --- 7. ⭐️ (แก้ไข!) ปุ่ม "แก้ไขสถานะโต๊ะ" (ให้เปลี่ยน Text) ⭐️ ---
  editTablesButton.addEventListener("click", () => {
    isEditMode = !isEditMode; // สลับโหมด true/false
    editTablesButton.classList.toggle("active", isEditMode); // สลับสีปุ่ม
    tableSelectionContainer.classList.toggle("edit-mode", isEditMode); // สลับคลาสที่ div แม่

    if (isEditMode) {
      console.log("เข้าสู่โหมดแก้ไขโต๊ะ");
      editTablesButton.textContent = "เสร็จสิ้น"; // 👈 (แก้ไข!)
      selectButton.style.display = 'none'; // ซ่อนปุ่ม "เลือก"
      // ล้างโต๊ะที่กำลังเลือกอยู่ (ถ้ามี)
      document.querySelectorAll('.table-item.selected').forEach(el => {
        el.classList.remove('selected');
      });
      currentTableId = null;
      currentTableNumber = null;
    } else {
      console.log("ออกจากโหมดแก้ไขโต๊ะ");
      editTablesButton.textContent = "แก้ไขสถานะโต๊ะ"; // 👈 (แก้ไข!)
      selectButton.style.display = 'block'; // เอากลับมา
    }
  });

  // --- 8. (ใหม่!) ฟังก์ชันสำหรับจัดการแก้ไขโต๊ะ ---
  function handleTableEdit(docId, tableData) {
    const newStatus = (tableData.status === "Available") ? "Occupied" : "Available";
    
    if (confirm(`โต๊ะที่ ${tableData.number} (สถานะ: ${tableData.status})\n\nคุณต้องการเปลี่ยนสถานะเป็น "${newStatus}" หรือไม่?`)) {
      db.collection("tables").doc(docId).update({
        status: newStatus
      }).catch(err => console.error("Error updating table status:", err));
    }
  }

  // --- (ฟังก์ชันที่เหลือคือเวอร์ชันสมบูรณ์) ---

  // --- 9. ฟังก์ชันดึงเมนูอาหาร ---
  function fetchMenuItems() {
    db.collection("menuItems").get()
      .then((querySnapshot) => {
        menuGridContainer.innerHTML = "";
        querySnapshot.forEach((doc) => {
          createMenuItemElement(doc.id, doc.data());
        });
      })
      .catch((error) => {
        console.error("Error getting menu items: ", error);
      });
  }

  // --- 10. ฟังก์ชันสร้าง UI เมนู 1 ชิ้น ---
  function createMenuItemElement(docId, itemData) {
    const itemDiv = document.createElement("div");
    itemDiv.className = "menu-item";
    itemDiv.dataset.id = docId;

    itemDiv.innerHTML = `
      <img src="${itemData.imageUrl || ''}" alt="${itemData.name}">
      <div class="menu-item-details">
        <h4>${itemData.name}</h4>
        <span class="price">฿ ${itemData.price.toFixed(2)}</span>
      </div>
    `;
    itemDiv.addEventListener("click", () => {
      openItemModal(itemData, docId);
    });
    menuGridContainer.appendChild(itemDiv);
  }

  // --- 11. ฟังก์ชันเปิด Modal (เวอร์ชันมีราคาพิเศษ) ---
  function openItemModal(itemData, docId) {
    currentSelectedItem = { ...itemData, id: docId }; 
    modalItemName.textContent = itemData.name;
    modalItemImage.src = itemData.imageUrl || '';
    modalNotes.value = "";
    
    if (itemData.specialprice && itemData.specialprice > 0) {
      modalPriceOptions.style.display = "flex";
      modalItemPriceDisplay.style.display = "none";
      modalBtnNormal.textContent = `ธรรมดา ฿${itemData.price.toFixed(2)}`;
      modalBtnNormal.dataset.price = itemData.price;
      modalBtnNormal.dataset.name = "ธรรมดา";
      modalBtnSpecial.textContent = `พิเศษ ฿${itemData.specialprice.toFixed(2)}`;
      modalBtnSpecial.dataset.price = itemData.specialprice;
      modalBtnSpecial.dataset.name = "พิเศษ";
      modalBtnNormal.classList.add("selected");
      modalBtnSpecial.classList.remove("selected");
      currentSelectedItem.selectedPrice = itemData.price;
      currentSelectedItem.selectedPriceName = "ธรรมดา";
    } else {
      modalPriceOptions.style.display = "none";
      modalItemPriceDisplay.style.display = "block";
      modalItemPriceDisplay.textContent = `฿ ${itemData.price.toFixed(2)}`;
      currentSelectedItem.selectedPrice = itemData.price;
      currentSelectedItem.selectedPriceName = "";
    }
    itemModal.style.display = "flex";
  }

  // --- 12. ฟังก์ชันปิด Modal ---
  function closeItemModal() {
    itemModal.style.display = "none";
    currentSelectedItem = null;
  }

  // --- 13. ฟังก์ชันเพิ่มของลงตะกร้า (เวอร์ชันมีราคาพิเศษ) ---
  function addItemToCart() {
    const notes = modalNotes.value;
    const priceName = currentSelectedItem.selectedPriceName 
      ? ` (${currentSelectedItem.selectedPriceName})` 
      : "";

    const cartItem = {
      id: currentSelectedItem.id,
      name: currentSelectedItem.name + priceName,
      price: currentSelectedItem.selectedPrice,
      notes: notes,
      qty: 1,
      imageUrl: currentSelectedItem.imageUrl || ''
    };
    
    cart.push(cartItem);
    console.log("Cart updated:", cart);
    updateCartCount();
    closeItemModal();
  }

  // --- 14. ฟังก์ชันอัปเดตเลขบนไอคอนตะกร้า ---
  function updateCartCount() {
    cartCountEl.textContent = cart.length;
  }

  // --- 15. Event Listeners (ปุ่มใน Modal) ---
  modalCloseButton.addEventListener("click", closeItemModal);
  addToCartButton.addEventListener("click", addItemToCart);

  // --- 16. Event Listeners สำหรับปุ่มเลือกราคา ---
  modalBtnNormal.addEventListener("click", () => {
    modalBtnNormal.classList.add("selected");
    modalBtnSpecial.classList.remove("selected");
    currentSelectedItem.selectedPrice = parseFloat(modalBtnNormal.dataset.price);
    currentSelectedItem.selectedPriceName = modalBtnNormal.dataset.name;
    console.log("Price selected:", currentSelectedItem.selectedPriceName);
  });

  modalBtnSpecial.addEventListener("click", () => {
    modalBtnSpecial.classList.add("selected");
    modalBtnNormal.classList.remove("selected");
    currentSelectedItem.selectedPrice = parseFloat(modalBtnSpecial.dataset.price);
    currentSelectedItem.selectedPriceName = modalBtnSpecial.dataset.name;
    console.log("Price selected:", currentSelectedItem.selectedPriceName);
  });


  // --- 17. Event Listeners (ไอคอนตะกร้า 🛒 และปุ่มย้อนกลับ ❮) ---
  cartIcon.addEventListener("click", () => {
    if (cart.length === 0) {
      alert("ตะกร้าว่างเปล่า");
      return;
    }
    menuContainer.style.display = "none";
    checkoutContainer.style.display = "block";

    cartIcon.style.display = "none"; // ⭐️ (เพิ่ม!) ซ่อนตะกร้า
    checkoutBackButton.style.display = "block"; // ⭐️ (เพิ่ม!) โชว์ปุ่มย้อนกลับ

    renderCheckoutSummary();
  });

  // --- (อัปเกรด!) Logic ปุ่มย้อนกลับ (❮) ---
  checkoutBackButton.addEventListener("click", () => {

    // 1. เช็คว่าเราอยู่หน้า "เช็คเอาท์" หรือไม่?
    if (checkoutContainer.style.display === "block") {
      // (ใช่) -> ให้กลับไปหน้า "เมนู"
      menuContainer.style.display = "block";
      checkoutContainer.style.display = "none";
      
      cartIcon.style.display = "block"; // โชว์ตะกร้า
      checkoutBackButton.style.display = "block"; // ปุ่มย้อนกลับยังอยู่
    
    } 
    // 2. ถ้าไม่อยู่หน้าเช็คเอาท์ (แสดงว่าอยู่หน้า "เมนู")
    else if (menuContainer.style.display === "block") {
      // (ใช่) -> ให้กลับไปหน้า "เลือกโต๊ะ"
      tableSelectionContainer.style.display = "block";
      menuContainer.style.display = "none";
      
      cartIcon.style.display = "none"; // ซ่อนตะกร้า
      checkoutBackButton.style.display = "none"; // ซ่อนปุ่มย้อนกลับ
    }
  });

  // --- 18. ฟังก์ชันสร้างหน้าสรุปยอด (มีปุ่มลบ) ---
  function renderCheckoutSummary() {
    checkoutList.innerHTML = "";
    let subtotal = 0;

    cart.forEach((item, index) => { // (เพิ่ม index)
      const itemDiv = document.createElement("div");
      itemDiv.className = "checkout-item";
      const notesHTML = item.notes 
        ? `<div class="item-notes">รายละเอียด: ${item.notes}</div>` 
        : "";
      
      // (เพิ่ม HTML ปุ่มลบ)
      itemDiv.innerHTML = `
        <button class="checkout-remove-btn" data-index="${index}"><img style="
        width:32px; height:32px;" src="../images/crosses.png" alt="Remove"/></button>
        
        <img src="${item.imageUrl || ''}" alt="${item.name}" class="checkout-item-image">
        
        <div class="item-info">
          <div class="item-name">${item.name} (x${item.qty})</div>
          ${notesHTML}
        </div>
        
        <div class="item-price">฿ ${item.price.toFixed(2)}</div>
      `;
      checkoutList.appendChild(itemDiv);
      subtotal += (item.price * item.qty);
    });

    summarySubtotal.textContent = `฿ ${subtotal.toFixed(2)}`;
    summaryTotal.textContent = `฿ ${subtotal.toFixed(2)}`;
    confirmTotalPrice.textContent = `฿ ${subtotal.toFixed(2)}`;

    // (เพิ่มใหม่) เพิ่ม Event Listeners ให้ปุ่มลบ
    checkoutList.querySelectorAll('.checkout-remove-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const indexToRemove = parseInt(e.currentTarget.dataset.index, 10);
        removeItemFromCart(indexToRemove);
      });
    });
  }

  // --- 19. จัดการการเลือกวิธีชำระเงิน ---
  paymentOptions.forEach(button => {
    button.addEventListener("click", () => {
      paymentOptions.forEach(btn => btn.classList.remove("selected"));
      button.classList.add("selected");
      selectedPaymentMethod = button.dataset.payment;
      console.log("Payment method selected:", selectedPaymentMethod);
    });
  });

  // --- 20. ฟังก์ชันยืนยันออเดอร์ (ปุ่มยอดชำระ) ---
  confirmOrderButton.addEventListener("click", () => {
    confirmOrderButton.disabled = true;
    confirmOrderButton.textContent = "กำลังบันทึก...";

    const finalTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    const orderItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        price: item.price,
        notes: item.notes,
        status: "Preparing"
    }));
    
    const orderObject = {
      tableId: currentTableId,
      tableNumber: currentTableNumber,
      items: orderItems,
      totalPrice: finalTotal,
      paymentMethod: selectedPaymentMethod,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("orders").add(orderObject)
      .then((docRef) => {
        console.log("Order written with ID: ", docRef.id);
        return db.collection("tables").doc(currentTableId).update({
          status: "Occupied"
        });
      })
      .then(() => {
        showSuccessPage();
      })
      .catch((error) => {
        console.error("Error adding order: ", error);
        alert("เกิดข้อผิดพลาดในการสั่งอาหาร กรุณาลองใหม่อีกครั้ง");
        confirmOrderButton.disabled = false;
        confirmOrderButton.innerHTML = `ยอดชำระ <span id="confirm-total-price">฿ 0.00</span>`;
      });
  });

  // --- 21. ฟังก์ชันแสดงหน้าสั่งสำเร็จ ---
  function showSuccessPage() {
    checkoutContainer.style.display = "none";
    successContainer.style.display = "block";

    checkoutBackButton.style.display = "none";

    // 22. รีเซ็ตทุกอย่าง
    cart = [];
    currentTableId = null;
    currentTableNumber = null;
    currentSelectedItem = null;
    updateCartCount();
    confirmOrderButton.disabled = false;
    confirmOrderButton.innerHTML = `ยอดชำระ <span id="confirm-total-price">฿ 0.00</span>`;

    setTimeout(() => {
      successContainer.style.display = "none";
      tableSelectionContainer.style.display = "block";
    }, 3000);
  }

  // --- 23. (เพิ่มใหม่!) ฟังก์ชันลบของออกจากตะกร้า ---
  function removeItemFromCart(index) {
    if (index > -1 && index < cart.length) {
      cart.splice(index, 1);
      console.log('Cart after removal:', cart);
      
      renderCheckoutSummary();
      updateCartCount();

      if (cart.length === 0) {
        menuContainer.style.display = "block";
        checkoutContainer.style.display = "none";

        // ⭐️ (เพิ่ม!) สั่งให้ตะกร้ากลับมาโชว์ ⭐️
        cartIcon.style.display = "block"; 
        
        // ⭐️ (เพิ่ม!) และปุ่มย้อนกลับก็ยังต้องโชว์ (เพราะเราอยู่หน้าเมนู) ⭐️
        checkoutBackButton.style.display = "block";
      }
    }
  }

}); // <-- ปิดวงเล็บของ DOMContentLoaded (ตัวสุดท้าย)