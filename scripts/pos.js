// --- Global Variables ---
let cart = []; // 👈 ตะกร้าสินค้าของเรา
let currentSelectedItem = null; // 👈 เก็บว่ากำลังเลือกเมนูไหน
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

  // --- 2. ดึงองค์ประกอบ HTML (Containers) ---
  const tableSelectionContainer = document.getElementById("table-selection-container");
  const menuContainer = document.getElementById("menu-container");
  const checkoutContainer = document.getElementById("checkout-container");
  const successContainer = document.getElementById("success-container"); // 👈 (เพิ่มมาใหม่)

  // --- (Table) ---
  const tableGridContainer = document.getElementById("table-grid-container");
  const selectButton = document.getElementById("select-table-button");

  // --- (Menu) ---
  const menuGridContainer = document.getElementById("menu-grid-container");
  const cartCountEl = document.getElementById("cart-count");
  const cartIcon = document.getElementById("cart-icon");

  // --- (Checkout) ---
  const checkoutBackButton = document.getElementById("checkout-back-button");
  const checkoutList = document.getElementById("checkout-list");
  const summarySubtotal = document.getElementById("summary-subtotal");
  const summaryTotal = document.getElementById("summary-total");
  const confirmTotalPrice = document.getElementById("confirm-total-price");
  const confirmOrderButton = document.getElementById("confirm-order-button"); // 👈 (เพิ่มมาใหม่)
  const paymentOptions = document.querySelectorAll(".payment-option");

  // --- (Modal) ---
  const itemModal = document.getElementById("item-modal");
  const modalCloseButton = document.getElementById("modal-close-button");
  const addToCartButton = document.getElementById("add-to-cart-button");
  const modalItemName = document.getElementById("modal-item-name");
  const modalItemImage = document.getElementById("modal-item-image");
  const modalItemPrice = document.getElementById("modal-item-price");
  const modalNotes = document.getElementById("modal-notes");
  

  // --- 3. ฟังก์ชันดึงข้อมูลโต๊ะ (หัวใจสำคัญ) ---
  function fetchTables() {
    db.collection("tables").orderBy("number").onSnapshot(
      (querySnapshot) => {
        tableGridContainer.innerHTML = ""; 
        querySnapshot.forEach((doc) => {
          createTableElement(doc.id, doc.data());
        });
      }, 
      (error) => {
        console.error("Error getting tables: ", error);
      }
    );
  }

  // --- 4. ฟังก์ชันสร้าง UI โต๊ะ 1 ตัว ---
  function createTableElement(docId, tableData) {
    const tableDiv = document.createElement("div");
    tableDiv.className = "table-item";
    tableDiv.dataset.id = docId;
    tableDiv.dataset.status = tableData.status;

    let iconUrl = (tableData.status === "Available") 
      ? "../images/table-available.jpeg" 
      : "../images/table-occupied.png";

    tableDiv.innerHTML = `
      <img src="${iconUrl}" alt="โต๊ะ">
      <span>โต๊ะที่ ${tableData.number}</span>
      <input type="radio" name="table_selection" value="${docId}" style="display: none;">
    `;

    // 5. เพิ่ม Event Listener ให้โต๊ะ (เมื่อถูกคลิก)
    tableDiv.addEventListener("click", () => {
      if (tableData.status === "Occupied") return; 

      document.querySelectorAll('.table-item.selected').forEach(el => {
        el.classList.remove('selected');
      });
      tableDiv.classList.add('selected');
      
      // เก็บทั้ง ID และ Number ของโต๊ะ
      currentTableId = docId;
      currentTableNumber = tableData.number;
      console.log(`Selected table: ${currentTableNumber} (ID: ${currentTableId})`);
    });
    tableGridContainer.appendChild(tableDiv);
  }


  // --- 6. ปุ่ม "เลือก" โต๊ะ ---
  selectButton.addEventListener("click", () => {
    if (currentTableId) {
      console.log("Proceeding with table:", currentTableNumber);
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

  // --- 8. ฟังก์ชันสร้าง UI เมนู 1 ชิ้น ---
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

    // 9. เพิ่ม Event Listener ให้เมนู (เมื่อถูกคลิก)
    itemDiv.addEventListener("click", () => {
      openItemModal(itemData);
    });

    menuGridContainer.appendChild(itemDiv);
  }

  // --- 10. ฟังก์ชันเปิด Modal ---
  function openItemModal(itemData) {
    currentSelectedItem = itemData;
    modalItemName.textContent = itemData.name;
    modalItemPrice.textContent = `฿ ${itemData.price.toFixed(2)}`;
    modalItemImage.src = itemData.imageUrl || '';
    modalNotes.value = "";
    itemModal.style.display = "flex";
  }

  // --- 11. ฟังก์ชันปิด Modal ---
  function closeItemModal() {
    itemModal.style.display = "none";
    currentSelectedItem = null;
  }

  // --- 12. ฟังก์ชันเพิ่มของลงตะกร้า ---
  function addItemToCart() {
    const notes = modalNotes.value;
    const cartItem = {
      name: currentSelectedItem.name,
      price: currentSelectedItem.price,
      notes: notes,
      qty: 1 ,
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

  // --- 14. เพิ่ม Event Listeners ให้ปุ่มใน Modal ---
  modalCloseButton.addEventListener("click", closeItemModal);
  addToCartButton.addEventListener("click", addItemToCart);

  // --- 15. Event Listeners (ไอคอนตะกร้า 🛒 และปุ่มย้อนกลับ ❮) ---
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

  // --- 16. ฟังก์ชันสร้างหน้าสรุปยอด (Checkout) ---
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
        <img src="${item.imageUrl || ''}" alt="${item.name}" class="checkout-item-image" width="100px" height="100px">
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

  // --- 17. จัดการการเลือกวิธีชำระเงิน ---
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

    // 1. คำนวณราคารวม (อีกครั้งเพื่อความปลอดภัย)
    const finalTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    // 2. สร้าง Object ที่จะส่งไป Firestore
    const orderObject = {
      tableId: currentTableId,
      tableNumber: currentTableNumber,
      items: cart, // (Array ตะกร้าทั้งหมด)
      totalPrice: finalTotal,
      paymentMethod: selectedPaymentMethod,
      status: "Preparing", // 👈 สถานะเริ่มต้นสำหรับ KDS
      timestamp: firebase.firestore.FieldValue.serverTimestamp() // 👈 เวลาที่สั่ง
    };

    // 3. ส่งออเดอร์ไปที่ Collection "orders"
    db.collection("orders").add(orderObject)
      .then((docRef) => {
        // 4. (สำเร็จ) อัปเดตสถานะโต๊ะเป็น "Occupied"
        console.log("Order written with ID: ", docRef.id);
        db.collection("tables").doc(currentTableId).update({
          status: "Occupied"
        });
      })
      .then(() => {
        // 5. (สำเร็จ) แสดงหน้า "สั่งสำเร็จ"
        showSuccessPage();
      })
      .catch((error) => {
        // 6. (ล้มเหลว)
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