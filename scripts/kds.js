// --- 1. CONFIG & SETUP (เหมือนเดิม) ---
    const firebaseConfig = {
        apiKey: "AIzaSyD1SI_Y7R6e7pBlM_2gGSBp0fkeem3aSpI",
        authDomain: "jahpongrestaurant.firebaseapp.com",
        projectId: "jahpongrestaurant",
        storageBucket: "jahpongrestaurant.firebasestorage.app",
        messagingSenderId: "97238013021",
        appId: "1:97238013021:web:6f613131285f7b6532e9b4",
        measurementId: "G-TKG07DGYD9"
    };
    
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    const activeOrdersPage = document.getElementById('active-orders-page');
    const historyPage = document.getElementById('history-page');
    const navActiveOrders = document.getElementById('nav-active-orders');
    const navHistory = document.getElementById('nav-history');
    const activeOrdersList = document.getElementById('active-orders-list');
    const historyList = document.getElementById('history-list');
    const confirmationModal = document.getElementById('confirmation-modal');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    const placeholderImage = "https://firebasestorage.googleapis.com/v0/b/jahpongrestaurant.appspot.com/o/menu%2Fduck-rice.jpg?alt=media&token=e6b2f4f2-7f7f-4c5b-8f3a-7a5d7c3e1b1f";

    // --- 2. STATE (อัปเดตใหม่) ---
    // เราต้องเก็บทั้ง ID ของ Order และ Index (ลำดับ) ของจาน
    let orderToConfirm = { 
        orderId: null, 
        itemIndex: -1 
    };

    // --- 3. AUTH & NAV (เหมือนเดิม) ---
    auth.onAuthStateChanged(user => {
        if (user) {
            if (user.email === 'kitchen@gmail.com') {
                console.log('Kitchen user logged in.');
                initializeApp();
            } else {
                alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
                auth.signOut();
                window.location.href = 'login.html';
            }
        } else {
            console.log('User not logged in. Redirecting...');
            window.location.href = 'login.html';
        }
    });

    function initializeApp() {
        setupNavigation();
        setupOrderListener(); // ⬅️ ฟังก์ชันนี้จะถูกเขียนใหม่
    }

    function setupNavigation() {
        navActiveOrders.addEventListener('click', () => {
            activeOrdersPage.classList.add('active');
            historyPage.classList.remove('active');
            navActiveOrders.classList.add('active');
            navHistory.classList.remove('active');
        });

        navHistory.addEventListener('click', () => {
            activeOrdersPage.classList.remove('active');
            historyPage.classList.add('active');
            navActiveOrders.classList.remove('active');
            navHistory.classList.add('active');
        });
    }

    // --- 4. FIREBASE LISTENER (เขียนใหม่) ---
    // Logic ใหม่: ดึง "ทุก" Order ที่มี "อย่างน้อย 1 item" ที่ยังไม่เสร็จ
    function setupOrderListener() {
        // เราไม่สามารถ Query สถานะที่อยู่ใน Array ได้ง่ายๆ
        // เราจึงจะดึง Order ที่ยัง Active ทั้งหมด (หรือจะดึงมาทั้งหมดเลยก็ได้ถ้า Order ไม่เยอะ)
        // ที่นี่ ผมจะใช้ "timestamp" ในการกรอง (สมมติว่าคุณบันทึกไว้)
        // หรือจะดึงมาทั้งหมดเลยก็ได้ถ้าไม่ซับซ้อน
        // ---
        // วิธีที่ง่ายที่สุด: ดึง Order ทั้งหมด แล้วใช้ JS กรอง
        // (ถ้ามี Order เก่าเป็นพันๆ ค่อยปรับ Query)
        db.collection('orders')
          .orderBy('timestamp', 'desc') // เอาของใหม่ขึ้นก่อน
          .limit(50) // ดึงมาแค่ 50 Order ล่าสุด (กันโหลดเยอะ)
          .onSnapshot(snapshot => {
            
            activeOrdersList.innerHTML = '';
            historyList.innerHTML = '';

            snapshot.docs.forEach(doc => {
                const orderData = doc.data();
                const orderId = doc.id;
                const table = orderData.tableNumber;

                if (!orderData.items || !Array.isArray(orderData.items)) {
                    return; // ข้าม Order ที่ไม่มี items
                }

                // ** Logic ใหม่: วนลูปทุก item และตรวจสอบ 'item.status' **
                orderData.items.forEach((item, index) => {
                    
                    if (!item || !item.status) {
                        // ข้าม item ที่ข้อมูลพัง หรือไม่มี status (ข้อมูลเก่า)
                        console.warn(`Skipping item index ${index} in order ${orderId}: missing item or status`);
                        return; 
                    }

                    // สร้าง Card โดยส่ง 'item.status' และ 'index' เข้าไปด้วย
                    const card = createOrderCard(item, orderId, table, item.status, index);
                    
                    // ** แยกรายการตาม 'item.status' **
                    if (item.status === 'Preparing') {
                        activeOrdersList.appendChild(card);
                    } else if (item.status === 'Complete') {
                        historyList.prepend(card);
                    }
                });
            });

        }, error => {
            console.error("Error fetching orders: ", error);
        });
    }

    // --- 5. CREATE ORDER CARD (อัปเดตใหม่) ---
    // เพิ่ม 2 parameters: itemStatus และ itemIndex
    function createOrderCard(item, orderId, table, itemStatus, itemIndex) {
        const card = document.createElement('div');
        card.className = 'order-card';
        // เราเก็บทั้ง 2 ค่าไว้ที่ Card (เผื่อใช้)
        card.dataset.orderId = orderId; 
        card.dataset.itemIndex = itemIndex;

        // ** ใช้ 'itemStatus' (สถานะของจาน) ตัดสินใจ ไม่ใช่ 'mainStatus' **
        const isHistory = itemStatus === 'Complete';

        const itemName = item.name || 'ไม่มีชื่อเมนู';
        const itemImage = item.imageUrl || placeholderImage;
        const itemNotes = item.notes || 'ไม่มี';
        const itemTable = table || '?';
        const itemPrice = Number(item.price) || 0;

        card.innerHTML = `
            <img src="${itemImage}" alt="${itemName}" class="order-image">
            <div class="order-details">
                <h3>${itemName}</h3>
                <p>รายละเอียด : ${itemNotes}</p>
                <p>โต๊ะ : ${itemTable}</p>
            </div>
            <div class="order-action">
                <span class="price">฿ ${itemPrice.toFixed(2)}</span>
                ${isHistory 
                    ? '<button class="done-button" disabled>เรียบร้อย</button>'
                    : '<button class="finish-button">เสร็จสิ้น</button>'
                }
            </div>
        `;

        if (!isHistory) {
            const finishButton = card.querySelector('.finish-button');
            finishButton.addEventListener('click', (e) => {
                e.stopPropagation();
                // ** ส่ง 'index' ของจานไปด้วย **
                openConfirmationModal(orderId, itemIndex);
            });
        }

        return card;
    }

    // --- 6. MODAL LOGIC (อัปเดตใหม่) ---
    function openConfirmationModal(orderId, itemIndex) {
        // เก็บทั้ง 2 ค่า
        orderToConfirm = { orderId, itemIndex };
        confirmationModal.style.display = 'flex';
    }

    function closeConfirmationModal() {
        // ล้างค่า
        orderToConfirm = { orderId: null, itemIndex: -1 };
        confirmationModal.style.display = 'none';
    }

    modalCancel.addEventListener('click', closeConfirmationModal);
    modalConfirm.addEventListener('click', confirmFinishOrder); // ⬅️ ฟังก์ชันนี้จะถูกเขียนใหม่

    // --- 7. UPDATE ORDER STATUS (เขียนใหม่ทั้งหมด) ---
    // นี่คือส่วนที่ซับซ้อนที่สุด
    async function confirmFinishOrder() {
        const { orderId, itemIndex } = orderToConfirm;
        
        // ตรวจสอบว่ามีค่าครบ
        if (!orderId || itemIndex < 0) return;

        const orderRef = db.collection('orders').doc(orderId);

        try {
            // เราต้องใช้ "Transaction" เพื่อ "อ่าน" ข้อมูลเก่า, "แก้ไข" Array,
            // แล้ว "เขียน" กลับไปใหม่ทั้งหมดอย่างปลอดภัย
            await db.runTransaction(async (transaction) => {
                const orderDoc = await transaction.get(orderRef);
                if (!orderDoc.exists) {
                    throw "Order document not found!";
                }

                const orderData = orderDoc.data();
                
                // คัดลอก Array 'items' เก่าออกมา
                // (เราต้องสร้าง Array ใหม่ทั้งหมด Firebase ถึงจะตรวจจับการเปลี่ยนแปลง)
                const newItems = [...orderData.items]; 

                // ตรวจสอบว่า item ที่จะแก้มีอยู่จริง
                if (newItems[itemIndex]) {
                    // ** นี่คือหัวใจหลัก: อัปเดต 'status' ของจานนั้นๆ **
                    newItems[itemIndex].status = 'Complete';
                } else {
                    throw "Item index not found in array!";
                }

                // สั่ง Transaction ให้อัปเดต 'items' ทั้งก้อน ด้วย Array ใหม่
                transaction.update(orderRef, { 
                    items: newItems 
                });
            });

            console.log('Order item status updated successfully!');
            closeConfirmationModal(); // ปิด Modal
            // onSnapshot จะทำงานอัตโนมัติ และย้าย Card ที่เสร็จแล้วไปหน้า History ให้เอง

        } catch (error) {
            console.error("Transaction failed: ", error);
            alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
        }
    }