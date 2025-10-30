// --- Global Variables ---
let cart = []; // 👈 ตะกร้าสินค้าของเรา
let currentSelectedItem = null; // 👈 (เราจะเพิ่ม selectedPrice เข้าไปในนี้)
let currentTableId = null; // 👈 เก็บ ID ของโต๊ะที่เลือก
let currentTableNumber = null; // 👈 เก็บ "เลข" โต๊ะที่เลือก
let selectedPaymentMethod = "Cash"; // 👈 ค่าเริ่มต้นวิธีชำระเงิน

// รอให้หน้าเว็บโหลดเสร็จ
document.addEventListener("DOMContentLoaded", () => {
  
  // --- 1. ตรวจสอบว่า User ล็อกอินมารึยัง ---
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User ล็อกอินอยู่
      console.log("User is logged in:", user.uid);
      fetchTables(); // เริ่มดึงข้อมูลโต๊ะ
    } else {
      // User ยังไม่ล็อกอิน ให้เด้งกลับไปหน้า login
      console.log("User is not logged in. Redirecting to login.");
      // ** แก้ Path ตรงนี้ให้ถูก ถ้า login.html ของคุณไม่ได้ชื่อนี้ **
      window.location.href = "login.html"; 
    }
  });

  // --- 2. ⭐️ (แก้ไข) ดึงองค์ประกอบ HTML (Containers) ---
  const tableSelectionContainer = document.getElementById("table-selection-container");
  const menuContainer = document.getElementById("menu-container");
  const checkoutContainer = document.getElementById("checkout-container");
  const successContainer = document.getElementById("success-container");

  // (Table)
  const tableGridContainer = document.getElementById("table-grid-container");
  const selectButton = document.getElementById("select-table-button");

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

  // (Modal)
  const itemModal = document.getElementById("item-modal");
  const modalCloseButton = document.getElementById("modal-close-button");
  const addToCartButton = document.getElementById("add-to-cart-button");
  const modalItemName = document.getElementById("modal-item-name");
  const modalItemImage = document.getElementById("modal-item-image");
  const modalNotes = document.getElementById("modal-notes");
  
  // ⭐️⭐️ (นี่คือส่วนที่ถูกต้อง) ดึงองค์ประกอบราคาใน Modal ⭐️⭐️
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

  // --- 4. ⭐️ (แก้ไข) ฟังก์ชันสร้าง UI โต๊ะ 1 ตัว (แก้ Bug ไอคอน) ---
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
      <div style="font-weight:bold;">โต๊ะที่ ${tableData.number}</div>
      <input type="radio" name="table_selection" value="${docId}" style="display: none;">
    `;

    // 5. เพิ่ม Event Listener ให้โต๊ะ (เมื่อถูกคลิก)
    tableDiv.addEventListener("click", () => {
      if (tableData.status === "Occupied") return; 

      document.querySelectorAll('.table-item.selected').forEach(el => {
        el.classList.remove('selected');
      });
      tableDiv.classList.add('selected');
      
      currentTableId = docId;
      currentTableNumber = tableData.number;
      console.log(`Selected table: ${currentTableNumber} (ID: ${currentTableId})`);
    });
    tableGridContainer.appendChild(tableDiv);
  }


  // --- 6. ปุ่ม "เลือก" โต๊ะ ---
  selectButton.addEventListener("click", () => {
    if (currentTableId) {
      tableSelectionContainer.style.display = "none";
      menuContainer.style.display = "block";
      fetchMenuItems(); 
    } else {
      alert("กรุณาเลือกโต๊ะก่อนครับ");
    }
  });

  // --- 7. ฟังก์ชันดึงเมนูอาหาร ---
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

  // --- 8. ⭐️ (แก้ไข) ฟังก์ชันสร้าง UI เมนู 1 ชิ้น ---
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

    // 9. ⭐️ (แก้ไข) เพิ่ม Event Listener ให้เมนู (เมื่อถูกคลิก) ⭐️
    itemDiv.addEventListener("click", () => {
      // **ส่ง doc.id ไปด้วย**
      openItemModal(itemData, docId);
    });

    menuGridContainer.appendChild(itemDiv);
  }

  // --- 10. ⭐️ (แก้ไข) ฟังก์ชันเปิด Modal (เวอร์ชันมีราคาพิเศษ) ⭐️ ---
  function openItemModal(itemData, docId) {
    // เก็บข้อมูลเมนูที่ถูกเลือก (รวม docId)
    currentSelectedItem = { ...itemData, id: docId }; 
    
    // เอาข้อมูลไปใส่ใน Modal
    modalItemName.textContent = itemData.name;
    modalItemImage.src = itemData.imageUrl || '';
    modalNotes.value = ""; // ล้างค่าเก่า
    
    // *** Logic ใหม่สำหรับสลับราคา ***
    if (itemData.specialprice && itemData.specialprice > 0) {
      // --- (กรณีมี 2 ราคา) ---
      modalPriceOptions.style.display = "flex"; // 👈 แสดงปุ่ม 2 ปุ่ม
      modalItemPriceDisplay.style.display = "none"; // 👈 ซ่อนราคาเดียว

      // ตั้งค่าปุ่ม "ธรรมดา"
      modalBtnNormal.textContent = `ธรรมดา ฿${itemData.price.toFixed(2)}`;
      modalBtnNormal.dataset.price = itemData.price;
      modalBtnNormal.dataset.name = "ธรรมดา";

      // ตั้งค่าปุ่ม "พิเศษ"
      modalBtnSpecial.textContent = `พิเศษ ฿${itemData.specialprice.toFixed(2)}`;
      modalBtnSpecial.dataset.price = itemData.specialprice;
      modalBtnSpecial.dataset.name = "พิเศษ";

      // เลือกปุ่ม "ธรรมดา" เป็นค่าเริ่มต้น
      modalBtnNormal.classList.add("selected");
      modalBtnSpecial.classList.remove("selected");
      
      // เก็บราคาที่เลือกไว้ใน state
      currentSelectedItem.selectedPrice = itemData.price;
      currentSelectedItem.selectedPriceName = "ธรรมดา";

    } else {
      // --- (กรณีมีราคาเดียว) ---
      modalPriceOptions.style.display = "none"; // 👈 ซ่อนปุ่ม 2 ปุ่ม
      modalItemPriceDisplay.style.display = "block"; // 👈 แสดงราคาเดียว

      // ⭐️ (แก้ไข) ตั้งค่าราคา (จาก ID ที่ถูกต้อง) ⭐️
      modalItemPriceDisplay.textContent = `฿ ${itemData.price.toFixed(2)}`;
      
      // เก็บราคาที่เลือกไว้ใน state
      currentSelectedItem.selectedPrice = itemData.price;
      currentSelectedItem.selectedPriceName = ""; // ไม่มีชื่อราคา
    }
    
    // แสดง Modal
    itemModal.style.display = "flex";
  }

  // --- 11. ฟังก์ชันปิด Modal ---
  function closeItemModal() {
    itemModal.style.display = "none";
    currentSelectedItem = null;
  }

  // --- 12. ⭐️ (แก้ไข) ฟังก์ชันเพิ่มของลงตะกร้า (เวอร์ชันมีราคาพิเศษ) ⭐️ ---
  function addItemToCart() {
    const notes = modalNotes.value;
    
    // (ใหม่!) สร้างชื่อเมนูแบบเต็ม (เช่น "ข้าวหน้าเป็ด (พิเศษ)")
    const priceName = currentSelectedItem.selectedPriceName 
      ? ` (${currentSelectedItem.selectedPriceName})` 
      : "";

    const cartItem = {
      id: currentSelectedItem.id, // 👈 (ใหม่!) เก็บ ID ของเมนูไว้
      name: currentSelectedItem.name + priceName, // 👈 (ใหม่!) ใช้ชื่อแบบเต็ม
      price: currentSelectedItem.selectedPrice, // 👈 (ใหม่!) ใช้ราคาที่เลือก
      notes: notes,
      qty: 1,
      imageUrl: currentSelectedItem.imageUrl || ''
    };
    
    cart.push(cartItem);
    console.log("Cart updated:", cart);
    updateCartCount();
    closeItemModal();
  }

  // --- 13. ฟังก์ชันอัปเดตเลขบนไอคอนตะกร้า ---
  function updateCartCount() {
    cartCountEl.textContent = cart.length;
  }

  // --- 14. Event Listeners (ปุ่มใน Modal) ---
  modalCloseButton.addEventListener("click", closeItemModal);
  addToCartButton.addEventListener("click", addItemToCart);

  // --- 15. ⭐️ (ที่ถูกต้อง) Event Listeners สำหรับปุ่มเลือกราคา ⭐️ ---
  modalBtnNormal.addEventListener("click", () => {
    // ไฮไลต์ปุ่ม
    modalBtnNormal.classList.add("selected");
    modalBtnSpecial.classList.remove("selected");
    // อัปเดต State
    currentSelectedItem.selectedPrice = parseFloat(modalBtnNormal.dataset.price);
    currentSelectedItem.selectedPriceName = modalBtnNormal.dataset.name;
    console.log("Price selected:", currentSelectedItem.selectedPriceName);
  });

  modalBtnSpecial.addEventListener("click", () => {
    // ไฮไลต์ปุ่ม
    modalBtnSpecial.classList.add("selected");
    modalBtnNormal.classList.remove("selected");
    // อัปเดต State
    currentSelectedItem.selectedPrice = parseFloat(modalBtnSpecial.dataset.price);
    currentSelectedItem.selectedPriceName = modalBtnSpecial.dataset.name;
    console.log("Price selected:", currentSelectedItem.selectedPriceName);
  });


  // --- 16. Event Listeners (ไอคอนตะกร้า 🛒 และปุ่มย้อนกลับ ❮) ---
  cartIcon.addEventListener("click", () => {
    if (cart.length === 0) {
      alert("ตะกร้าว่างเปล่า");
      return;
    }
    menuContainer.style.display = "none";
    checkoutContainer.style.display = "block";
    renderCheckoutSummary();
  });

  checkoutBackButton.addEventListener("click", () => {
    menuContainer.style.display = "block";
    checkoutContainer.style.display = "none";
  });

  // --- 17. ฟังก์ชันสร้างหน้าสรุปยอด (Checkout) ---
  function renderCheckoutSummary() {
    checkoutList.innerHTML = "";
    let subtotal = 0;

    cart.forEach(item => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "checkout-item";
      const notesHTML = item.notes 
        ? `<div class="item-notes">รายละเอียด: ${item.notes}</div>` 
        : "";
      
      itemDiv.innerHTML = `
        <img src="${item.imageUrl || ''}" alt="${item.name}" class="checkout-item-image">
        <div class="item-name">${item.name} (x${item.qty})</div>
        <div class="item-price">฿ ${item.price.toFixed(2)}</div>
        ${notesHTML}
      `;
      checkoutList.appendChild(itemDiv);
      subtotal += (item.price * item.qty);
    });

    summarySubtotal.textContent = `฿ ${subtotal.toFixed(2)}`;
    summaryTotal.textContent = `฿ ${subtotal.toFixed(2)}`;
    confirmTotalPrice.textContent = `฿ ${subtotal.toFixed(2)}`;
  }

  // --- 18. จัดการการเลือกวิธีชำระเงิน ---
  paymentOptions.forEach(button => {
    button.addEventListener("click", () => {
      paymentOptions.forEach(btn => btn.classList.remove("selected"));
      button.classList.add("selected");
      selectedPaymentMethod = button.dataset.payment;
      console.log("Payment method selected:", selectedPaymentMethod);
    });
  });

  // --- 18. (ใหม่!) ฟังก์ชันยืนยันออเดอร์ (ปุ่มยอดชำระ) ---
  confirmOrderButton.addEventListener("click", () => {
    // ป้องกันการกดซ้ำ
    confirmOrderButton.disabled = true;
    confirmOrderButton.textContent = "กำลังบันทึก...";

    // 1. คำนวณราคารวม
    const finalTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // --- ⬇️ (นี่คือส่วนที่แก้ไขทั้งหมด) ⬇️ ---

    // 2. สร้าง 'items' Array ใหม่ ที่มี status ในแต่ละจาน
    // เราใช้ .map() เพื่อวนลูปทุกชิ้นใน 'cart'
    const itemsWithStatus = cart.map(item => ({
        ...item, // คัดลอกข้อมูลเดิม (name, price, notes, imageUrl, qty)
        status: "Preparing" // ⬅️ **เพิ่ม 'status' เข้าไปใน "จาน"**
    }));

    // 3. สร้าง Object ที่จะส่งไป Firestore (ใน "รูปแบบใหม่")
    const orderObject = {
      tableId: currentTableId,
      tableNumber: currentTableNumber,
      items: itemsWithStatus, // 👈 ใช้ Array ใหม่ที่มี 'status'
      totalPrice: finalTotal,
      paymentMethod: selectedPaymentMethod,
      // status: "Preparing", // ⬅️ **"ห้าม" มี status ระดับบนอีกต่อไป**
      timestamp: firebase.firestore.FieldValue.serverTimestamp() 
    };
    
    // --- ⬆️ (จบส่วนที่แก้ไข) ⬆️ ---


    // 4. ส่งออเดอร์ (รูปแบบใหม่) ไปที่ Collection "orders"
    db.collection("orders").add(orderObject)
      .then((docRef) => {
        // 5. (สำเร็จ) อัปเดตสถานะโต๊ะเป็น "Occupied"
        console.log("Order written with ID: ", docRef.id);
        db.collection("tables").doc(currentTableId).update({
          status: "Occupied"
        });
      })
      .then(() => {
        // 6. (สำเร็จ) แสดงหน้า "สั่งสำเร็จ"
        showSuccessPage();
      })
      .catch((error) => {
        // 7. (ล้มเหลว)
        console.error("Error adding order: ", error);
        alert("เกิดข้อผิดพลาดในการสั่งอาหาร กรุณาลองใหม่อีกครั้ง");
        confirmOrderButton.disabled = false;
        confirmOrderButton.textContent = "ยอดชำระ";
      });
  });

  // --- 19. (ใหม่!) ฟังก์ชันแสดงหน้าสั่งสำเร็จ ---
  function showSuccessPage() {
    checkoutContainer.style.display = "none";
    successContainer.style.display = "block";

    // 20. (ใหม่!) รีเซ็ตทุกอย่าง
    cart = [];
    currentTableId = null;
    currentTableNumber = null;
    currentSelectedItem = null; 
    updateCartCount();
    confirmOrderButton.disabled = false;
    confirmOrderButton.innerHTML = `ยอดชำระ <span id="confirm-total-price">฿ 0.00</span>`; // รีเซ็ตปุ่ม

    // กลับไปหน้าเลือกโต๊ะอัตโนมัติใน 3 วินาที
    setTimeout(() => {
      successContainer.style.display = "none";
      tableSelectionContainer.style.display = "block";
    }, 3000);
  }

}); // <-- ปิดวงเล็บของ DOMContentLoaded (ตัวสุดท้าย)