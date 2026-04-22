// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBO5WdFQIYpwCylsIFIkAvV6ZHnp5imd-o',
  authDomain: 'dwaraka-hostel.firebaseapp.com',
  projectId: 'dwaraka-hostel',
  storageBucket: 'dwaraka-hostel.firebasestorage.app',
  messagingSenderId: '135610429009',
  appId: '1:135610429009:web:5a3a485ea6e88f4f855270',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function formatCurrency(amount: any) {
  return `₹${Number(amount || 0)}`;
}

function monthToTimestamp(monthLabel: string) {
  const d = new Date(`1 ${monthLabel}`);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export default function App() {
  const [selectedHostel, setSelectedHostel] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [activeTab, setActiveTab] = useState('rooms');
  const [openTenantId, setOpenTenantId] = useState('');

  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerHostels, setOwnerHostels] = useState<string[]>([]);
  const [ownerError, setOwnerError] = useState('');

  const [rooms, setRooms] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);

  const [selectedFeeTenant, setSelectedFeeTenant] = useState('');
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [showVacantOnly, setShowVacantOnly] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [feeSearch, setFeeSearch] = useState('');
  const [complaintSearch, setComplaintSearch] = useState('');

  const [roomForm, setRoomForm] = useState({
    roomNo: '',
    block: '',
    roomType: '',
    totalBeds: '',
    occupiedBeds: '',
    monthlyRentDefault: '',
    status: 'Active',
  });

  const [tenantForm, setTenantForm] = useState({
    name: '',
    phone: '',
    parentPhone: '',
    idNumber: '',
    aadhaarNo: '',
    joiningDate: '',
    roomNo: '',
    bedNo: '',
    monthlyFee: '',
    securityDeposit: '',
    advancePaid: '',
    address: '',
    notes: '',
    status: 'Active',
  });

  const [feeForm, setFeeForm] = useState({
    tenantName: '',
    month: '',
    monthDate: '',
    amount: '',
    paidAmount: '',
    dueDate: '',
    paymentDate: '',
    paymentMethod: 'Cash',
    remarks: '',
    status: 'Unpaid',
  });

  const [complaintForm, setComplaintForm] = useState({
    tenantName: '',
    roomNo: '',
    type: 'Water',
    text: '',
    date: '',
    priority: 'Medium',
    status: 'Pending',
    resolvedDate: '',
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);

      if (!u?.email) {
        setOwnerHostels([]);
        setSelectedHostel('');
        setOwnerError('');
        return;
      }

      setOwnerLoading(true);
      setOwnerError('');

      try {
        const ownerQuery = query(
          collection(db, 'owners'),
          where('email', '==', u.email)
        );
        const snapshot = await getDocs(ownerQuery);

        if (snapshot.empty) {
          setOwnerHostels([]);
          setSelectedHostel('');
          setOwnerError('No hostel assigned for this login.');
          await signOut(auth);
        } else {
          const ownerData = snapshot.docs[0].data();
          const hostelsList = Array.isArray(ownerData.hostels)
            ? ownerData.hostels
            : ownerData.hostel
            ? [ownerData.hostel]
            : [];

          if (!hostelsList.length) {
            setOwnerHostels([]);
            setSelectedHostel('');
            setOwnerError('No hostel assigned for this login.');
            await signOut(auth);
          } else {
            setOwnerHostels(hostelsList);
            setSelectedHostel(hostelsList[0]);
          }
        }
      } catch {
        setOwnerHostels([]);
        setSelectedHostel('');
        setOwnerError('Failed to load owner hostel.');
      } finally {
        setOwnerLoading(false);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !selectedHostel) {
      setRooms([]);
      setTenants([]);
      setFees([]);
      setComplaints([]);
      return;
    }

    const unsubRooms = onSnapshot(
      query(collection(db, 'rooms'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setRooms(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubTenants = onSnapshot(
      query(collection(db, 'tenants'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setTenants(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubFees = onSnapshot(
      query(collection(db, 'fees'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setFees(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubComplaints = onSnapshot(
      query(collection(db, 'complaints'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setComplaints(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubRooms();
      unsubTenants();
      unsubFees();
      unsubComplaints();
    };
  }, [user, selectedHostel]);

  useEffect(() => {
    setSelectedRoom('');
    setSelectedFeeTenant('');
    setShowUnpaidOnly(false);
    setShowVacantOnly(false);
    setTenantSearch('');
    setRoomSearch('');
    setFeeSearch('');
    setComplaintSearch('');
    setOpenTenantId('');
  }, [selectedHostel]);

  const currentRooms = useMemo(
    () =>
      rooms.filter(
        (item) =>
          ownerHostels.includes(item.hostel) && item.hostel === selectedHostel
      ),
    [rooms, selectedHostel, ownerHostels]
  );

  const currentTenants = useMemo(
    () =>
      tenants.filter(
        (item) =>
          ownerHostels.includes(item.hostel) && item.hostel === selectedHostel
      ),
    [tenants, selectedHostel, ownerHostels]
  );

  const currentFees = useMemo(
    () =>
      fees.filter(
        (item) =>
          ownerHostels.includes(item.hostel) && item.hostel === selectedHostel
      ),
    [fees, selectedHostel, ownerHostels]
  );

  const currentComplaints = useMemo(
    () =>
      complaints.filter(
        (item) =>
          ownerHostels.includes(item.hostel) && item.hostel === selectedHostel
      ),
    [complaints, selectedHostel, ownerHostels]
  );

  const searchedRooms = useMemo(() => {
    const list = showVacantOnly
      ? currentRooms.filter((room) => {
          const occupied = currentTenants.filter(
            (t) => t.roomNo === room.roomNo
          ).length;
          return Number(room.totalBeds || 0) - occupied > 0;
        })
      : currentRooms;

    return list.filter((room) =>
      `${room.roomNo} ${room.block || ''} ${room.roomType || ''}`
        .toLowerCase()
        .includes(roomSearch.toLowerCase())
    );
  }, [currentRooms, currentTenants, showVacantOnly, roomSearch]);

  const filteredTenants = useMemo(() => {
    let list = currentTenants;
    if (selectedRoom) list = list.filter((t) => t.roomNo === selectedRoom);

    if (tenantSearch.trim()) {
      const q = tenantSearch.toLowerCase();
      list = list.filter((t) =>
        `${t.name} ${t.roomNo} ${t.phone} ${t.aadhaarNo || ''}`
          .toLowerCase()
          .includes(q)
      );
    }

    return list;
  }, [currentTenants, selectedRoom, tenantSearch]);

  const tenantNames = useMemo(
    () => currentTenants.map((item) => item.name).filter(Boolean),
    [currentTenants]
  );

  const displayedFeeRecords = useMemo(() => {
    let base = selectedFeeTenant
      ? currentFees.filter((f) => f.tenantName === selectedFeeTenant)
      : currentFees;

    if (showUnpaidOnly) {
      base = base.filter(
        (f) => f.status === 'Unpaid' || Number(f.dueAmount || 0) > 0
      );
    }

    if (feeSearch.trim()) {
      const q = feeSearch.toLowerCase();
      base = base.filter((f) =>
        `${f.tenantName} ${f.month} ${f.status}`.toLowerCase().includes(q)
      );
    }

    return [...base].sort(
      (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)
    );
  }, [currentFees, selectedFeeTenant, showUnpaidOnly, feeSearch]);

  const displayedComplaints = useMemo(() => {
    let list = currentComplaints;
    if (complaintSearch.trim()) {
      const q = complaintSearch.toLowerCase();
      list = list.filter((c) =>
        `${c.tenantName} ${c.roomNo} ${c.type} ${c.status} ${c.text}`
          .toLowerCase()
          .includes(q)
      );
    }
    return list;
  }, [currentComplaints, complaintSearch]);

  const monthlyCollectedSummary = useMemo(() => {
    const monthTotals: any = {};
    currentFees.forEach((fee) => {
      const paid = Number(fee.paidAmount || 0);
      if (paid > 0) monthTotals[fee.month] = (monthTotals[fee.month] || 0) + paid;
    });

    return Object.entries(monthTotals)
      .map(([month, total]) => ({ month, total }))
      .sort((a: any, b: any) => monthToTimestamp(b.month) - monthToTimestamp(a.month));
  }, [currentFees]);

  const currentMonthLabel = new Date().toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const currentMonthRecords = useMemo(
    () => currentFees.filter((fee) => fee.month === currentMonthLabel),
    [currentFees, currentMonthLabel]
  );

  const currentMonthExpectedFee = useMemo(
    () => currentMonthRecords.reduce((s, i) => s + Number(i.amount || 0), 0),
    [currentMonthRecords]
  );
  const currentMonthCollected = useMemo(
    () => currentMonthRecords.reduce((s, i) => s + Number(i.paidAmount || 0), 0),
    [currentMonthRecords]
  );
  const currentMonthPending = useMemo(
    () => currentMonthRecords.reduce((s, i) => s + Number(i.dueAmount || 0), 0),
    [currentMonthRecords]
  );
  const totalSecurityDepositCollected = useMemo(
    () => currentTenants.reduce((s, i) => s + Number(i.securityDeposit || 0), 0),
    [currentTenants]
  );

  const activeComplaints = useMemo(
    () => currentComplaints.filter((c) => c.status !== 'Resolved').length,
    [currentComplaints]
  );
  const resolvedComplaints = useMemo(
    () => currentComplaints.filter((c) => c.status === 'Resolved').length,
    [currentComplaints]
  );

  const stats = useMemo(() => {
    const totalRooms = currentRooms.length;
    const totalBeds = currentRooms.reduce(
      (sum, item) => sum + Number(item.totalBeds || 0),
      0
    );
    const occupiedBeds = currentTenants.length;
    const vacantBeds = Math.max(0, totalBeds - occupiedBeds);

    return {
      totalRooms,
      totalBeds,
      occupiedBeds,
      vacantBeds,
      totalTenants: currentTenants.length,
    };
  }, [currentRooms, currentTenants]);

  const handleLogin = async () => {
    try {
      setOwnerError('');
      await signInWithEmailAndPassword(auth, email, password);
      setPassword('');
    } catch {
      alert('Wrong email or password');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setOwnerHostels([]);
    setSelectedHostel('');
  };

  const addRoom = async () => {
    if (!roomForm.roomNo || !roomForm.totalBeds) {
      alert('Enter room number and total beds');
      return;
    }

    const duplicate = currentRooms.some(
      (r) => String(r.roomNo).trim() === String(roomForm.roomNo).trim()
    );
    if (duplicate) {
      alert('Room number already exists');
      return;
    }

    await addDoc(collection(db, 'rooms'), {
      hostel: selectedHostel,
      roomNo: roomForm.roomNo.trim(),
      block: roomForm.block.trim(),
      roomType: roomForm.roomType.trim(),
      totalBeds: Number(roomForm.totalBeds || 0),
      occupiedBeds: Number(roomForm.occupiedBeds || 0),
      availableBeds:
        Number(roomForm.totalBeds || 0) - Number(roomForm.occupiedBeds || 0),
      monthlyRentDefault: roomForm.monthlyRentDefault,
      status: roomForm.status,
      createdAt: Date.now(),
    });

    setRoomForm({
      roomNo: '',
      block: '',
      roomType: '',
      totalBeds: '',
      occupiedBeds: '',
      monthlyRentDefault: '',
      status: 'Active',
    });

    alert('Room added successfully');
  };

  const addTenant = async () => {
    if (!tenantForm.name || !tenantForm.roomNo || !tenantForm.bedNo) {
      alert('Fill tenant name, room number and bed number');
      return;
    }

    const roomMatch = currentRooms.find((r) => r.roomNo === tenantForm.roomNo);
    if (!roomMatch) {
      alert('Room not found');
      return;
    }

    const totalBeds = Number(roomMatch.totalBeds || 0);
    const tenantsInRoom = currentTenants.filter((t) => t.roomNo === tenantForm.roomNo);

    if (tenantsInRoom.length >= totalBeds) {
      alert('Room capacity is full. Cannot add more tenants.');
      return;
    }

    const sameBed = tenantsInRoom.some(
      (t) =>
        String(t.bedNo).trim().toLowerCase() ===
        String(tenantForm.bedNo).trim().toLowerCase()
    );
    if (sameBed) {
      alert('This bed number is already occupied in the room.');
      return;
    }

    await addDoc(collection(db, 'tenants'), {
      hostel: selectedHostel,
      name: tenantForm.name.trim(),
      phone: tenantForm.phone,
      parentPhone: tenantForm.parentPhone,
      idNumber: tenantForm.idNumber,
      aadhaarNo: tenantForm.aadhaarNo,
      joiningDate: tenantForm.joiningDate,
      roomNo: tenantForm.roomNo.trim(),
      bedNo: tenantForm.bedNo.trim(),
      monthlyFee: Number(tenantForm.monthlyFee || 0),
      securityDeposit: Number(tenantForm.securityDeposit || 0),
      advancePaid: Number(tenantForm.advancePaid || 0),
      address: tenantForm.address,
      notes: tenantForm.notes,
      status: tenantForm.status,
      createdAt: Date.now(),
    });

    const newOccupied = tenantsInRoom.length + 1;
    await updateDoc(doc(db, 'rooms', roomMatch.id), {
      occupiedBeds: newOccupied,
      availableBeds: Math.max(0, totalBeds - newOccupied),
    });

    setTenantForm({
      name: '',
      phone: '',
      parentPhone: '',
      idNumber: '',
      aadhaarNo: '',
      joiningDate: '',
      roomNo: selectedRoom || '',
      bedNo: '',
      monthlyFee: '',
      securityDeposit: '',
      advancePaid: '',
      address: '',
      notes: '',
      status: 'Active',
    });

    alert('Tenant added successfully');
  };

  const addFee = async () => {
    if (!feeForm.tenantName || !feeForm.month || !feeForm.amount) {
      alert('Select tenant, month and amount');
      return;
    }

    const amount = Number(feeForm.amount || 0);
    const paidAmount =
      feeForm.status === 'Paid'
        ? amount
        : feeForm.status === 'Partial'
        ? Number(feeForm.paidAmount || 0)
        : 0;

    const dueAmount = Math.max(0, amount - paidAmount);
    const finalStatus =
      dueAmount === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Unpaid';

    await addDoc(collection(db, 'fees'), {
      hostel: selectedHostel,
      tenantName: feeForm.tenantName,
      month: feeForm.month,
      amount,
      paidAmount,
      dueAmount,
      dueDate: feeForm.dueDate,
      paymentDate:
        finalStatus === 'Paid' || finalStatus === 'Partial'
          ? feeForm.paymentDate || new Date().toLocaleDateString()
          : '',
      paymentMethod: feeForm.paymentMethod,
      remarks: feeForm.remarks,
      status: finalStatus,
      createdAt: Date.now(),
    });

    setSelectedFeeTenant(feeForm.tenantName);
    setFeeForm({
      tenantName: feeForm.tenantName,
      month: '',
      monthDate: '',
      amount: '',
      paidAmount: '',
      dueDate: '',
      paymentDate: '',
      paymentMethod: 'Cash',
      remarks: '',
      status: 'Unpaid',
    });

    alert('Fee record added successfully');
  };

  const addComplaint = async () => {
    if (!complaintForm.tenantName || !complaintForm.text) {
      alert('Select tenant and enter complaint');
      return;
    }

    await addDoc(collection(db, 'complaints'), {
      hostel: selectedHostel,
      tenantName: complaintForm.tenantName,
      roomNo: complaintForm.roomNo,
      type: complaintForm.type,
      text: complaintForm.text,
      date: complaintForm.date || new Date().toLocaleDateString(),
      priority: complaintForm.priority,
      status: complaintForm.status,
      resolvedDate: complaintForm.resolvedDate,
      createdAt: Date.now(),
    });

    setComplaintForm({
      tenantName: '',
      roomNo: '',
      type: 'Water',
      text: '',
      date: '',
      priority: 'Medium',
      status: 'Pending',
      resolvedDate: '',
    });

    alert('Complaint added successfully');
  };

  const toggleFeeStatus = async (id: string, currentStatus: string, currentAmount: any) => {
    let newStatus = 'Paid';
    let paidAmount = Number(currentAmount || 0);
    let dueAmount = 0;
    let paymentDate = new Date().toLocaleDateString();

    if (currentStatus === 'Paid') {
      newStatus = 'Unpaid';
      paidAmount = 0;
      dueAmount = Number(currentAmount || 0);
      paymentDate = '';
    }

    await updateDoc(doc(db, 'fees', id), {
      status: newStatus,
      paidAmount,
      dueAmount,
      paymentDate,
    });
  };

  const toggleComplaintStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Resolved' ? 'Pending' : 'Resolved';
    await updateDoc(doc(db, 'complaints', id), {
      status: newStatus,
      resolvedDate: newStatus === 'Resolved' ? new Date().toLocaleDateString() : '',
    });
  };

  const deleteItem = async (collectionName: string, id: string) => {
    const ok = window.confirm('Are you sure you want to delete this record?');
    if (!ok) return;
    await deleteDoc(doc(db, collectionName, id));
    alert('Deleted successfully');
  };

  const deleteTenantWithRelatedData = async (tenant: any) => {
    const ok = window.confirm(`Delete ${tenant.name} and all related fee/complaint data?`);
    if (!ok) return;

    try {
      const roomMatch = currentRooms.find((r) => r.roomNo === tenant.roomNo);

      await deleteDoc(doc(db, 'tenants', tenant.id));

      const feesQuery = query(
        collection(db, 'fees'),
        where('hostel', '==', selectedHostel),
        where('tenantName', '==', tenant.name)
      );
      const feesSnapshot = await getDocs(feesQuery);
      for (const feeDoc of feesSnapshot.docs) {
        await deleteDoc(doc(db, 'fees', feeDoc.id));
      }

      const complaintsQuery = query(
        collection(db, 'complaints'),
        where('hostel', '==', selectedHostel),
        where('tenantName', '==', tenant.name)
      );
      const complaintsSnapshot = await getDocs(complaintsQuery);
      for (const complaintDoc of complaintsSnapshot.docs) {
        await deleteDoc(doc(db, 'complaints', complaintDoc.id));
      }

      if (roomMatch) {
        const remainingRoomTenantsQuery = query(
          collection(db, 'tenants'),
          where('hostel', '==', selectedHostel),
          where('roomNo', '==', tenant.roomNo)
        );
        const remainingRoomTenantsSnapshot = await getDocs(remainingRoomTenantsQuery);
        const remainingCount = remainingRoomTenantsSnapshot.docs.length;
        const totalBeds = Number(roomMatch.totalBeds || 0);

        await updateDoc(doc(db, 'rooms', roomMatch.id), {
          occupiedBeds: remainingCount,
          availableBeds: Math.max(0, totalBeds - remainingCount),
        });
      }

      if (selectedFeeTenant === tenant.name) setSelectedFeeTenant('');
      if (openTenantId === tenant.id) setOpenTenantId('');

      alert('Tenant and related records deleted successfully');
    } catch {
      alert('Failed to delete tenant data');
    }
  };

  const openRoomTenants = (roomNo: string) => {
    setSelectedRoom(roomNo);
    setTenantForm((prev) => ({ ...prev, roomNo }));
    setShowVacantOnly(false);
    setActiveTab('tenants');
  };

  const openTenantFees = (tenantName: string) => {
    setSelectedFeeTenant(tenantName);
    setFeeForm((prev) => ({ ...prev, tenantName }));
    setShowUnpaidOnly(false);
    setActiveTab('fees');
  };

  if (authLoading || ownerLoading) {
    return (
      <div style={styles.authPage}>
        <div style={styles.authCard}>
          <h2 style={styles.authTitle}>Loading...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.authPage}>
        <div style={styles.authCard}>
          <p style={styles.smallDark}>DWARAKA STAYS</p>
          <h2 style={styles.authTitle}>Owner Login</h2>
          <p style={styles.authSub}>Only admin can access the dashboard</p>

          <input
            style={styles.input}
            type="email"
            placeholder="Owner Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {ownerError ? <p style={styles.errorText}>{ownerError}</p> : null}

          <button style={styles.primaryBtn} onClick={handleLogin}>
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.hero}>
          <div>
            <p style={styles.small}>DWARAKA STAYS</p>
            <h1 style={styles.title}>Firebase Hostel Management</h1>
            <p style={styles.subtitle}>
              Accessible hostels: {ownerHostels.join(', ')}
            </p>
          </div>

          <div style={styles.heroRight}>
            <div style={styles.switchBox}>
              <label style={styles.label}>Select Hostel</label>
              <select
                style={styles.select}
                value={selectedHostel}
                onChange={(e) => setSelectedHostel(e.target.value)}
              >
                {ownerHostels.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <button style={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <StatCard title="Total Rooms" value={stats.totalRooms} sub={`Beds: ${stats.totalBeds}`} onClick={() => setActiveTab('rooms')} />
          <StatCard title="Occupied Beds" value={stats.occupiedBeds} sub={`Vacant: ${stats.vacantBeds}`} />
          <StatCard title="Vacant Beds" value={stats.vacantBeds} sub={`Occupied: ${stats.occupiedBeds}`} onClick={() => {
            setActiveTab('rooms');
            setShowVacantOnly(true);
          }} />
          <StatCard title="Total Tenants" value={stats.totalTenants} sub="Saved online" onClick={() => setActiveTab('tenants')} />
          <StatCard title="Expected Fee" value={formatCurrency(currentMonthExpectedFee)} sub={currentMonthLabel} />
          <StatCard title="Collected Fee" value={formatCurrency(currentMonthCollected)} sub={currentMonthLabel} />
          <StatCard title="Pending Fee" value={formatCurrency(currentMonthPending)} sub={currentMonthLabel} onClick={() => {
            setActiveTab('fees');
            setShowUnpaidOnly(true);
          }} />
          <StatCard title="Security Deposit" value={formatCurrency(totalSecurityDepositCollected)} sub="Collected" />
          <StatCard title="Active Complaints" value={activeComplaints} sub="Open" onClick={() => setActiveTab('complaints')} />
          <StatCard title="Resolved Complaints" value={resolvedComplaints} sub="Closed" onClick={() => setActiveTab('complaints')} />
        </div>

        <div style={styles.collectionBanner}>
          <div style={styles.collectionCard}>
            <p style={styles.collectionTitle}>Current Month Collected</p>
            <h3 style={styles.collectionValue}>{formatCurrency(currentMonthCollected)}</h3>
            <span style={styles.collectionSub}>{currentMonthLabel}</span>
          </div>

          <div style={styles.collectionCard}>
            <p style={styles.collectionTitle}>Monthly Collection Summary</p>
            {monthlyCollectedSummary.length === 0 ? (
              <span style={styles.collectionSub}>No paid data yet</span>
            ) : (
              monthlyCollectedSummary.slice(0, 6).map((item: any) => (
                <p key={item.month} style={styles.summaryRow}>
                  {item.month}: {formatCurrency(item.total)}
                </p>
              ))
            )}
          </div>
        </div>

        <div style={styles.tabs}>
          {[
            ['rooms', 'Rooms / Beds'],
            ['tenants', 'Tenant Details'],
            ['fees', 'Monthly Fees'],
            ['complaints', 'Complaints'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                ...styles.tab,
                ...(activeTab === key ? styles.activeTab : {}),
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'rooms' && (
          <div style={styles.grid2}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Add Room - {selectedHostel}</h2>
              <input style={styles.input} placeholder="Room Number" value={roomForm.roomNo} onChange={(e) => setRoomForm({ ...roomForm, roomNo: e.target.value })} />
              <input style={styles.input} placeholder="Block / Floor" value={roomForm.block} onChange={(e) => setRoomForm({ ...roomForm, block: e.target.value })} />
              <input style={styles.input} placeholder="Room Type" value={roomForm.roomType} onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value })} />
              <input style={styles.input} type="number" placeholder="Capacity / Total Beds" value={roomForm.totalBeds} onChange={(e) => setRoomForm({ ...roomForm, totalBeds: e.target.value })} />
              <input style={styles.input} type="number" placeholder="Occupied Beds" value={roomForm.occupiedBeds} onChange={(e) => setRoomForm({ ...roomForm, occupiedBeds: e.target.value })} />
              <input style={styles.input} placeholder="Default Monthly Rent" value={roomForm.monthlyRentDefault} onChange={(e) => setRoomForm({ ...roomForm, monthlyRentDefault: e.target.value })} />
              <select style={styles.select} value={roomForm.status} onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inactive">Inactive</option>
              </select>
              <button style={styles.primaryBtn} onClick={addRoom}>Add Room</button>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Room Availability</h2>
              <input
                style={styles.input}
                placeholder="Search room / block / type"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
              />

              {searchedRooms.length === 0 ? (
                <p style={styles.empty}>No rooms yet</p>
              ) : (
                searchedRooms.map((room) => {
                  const occupied = currentTenants.filter(
                    (t) => t.roomNo === room.roomNo
                  ).length;
                  const available = Math.max(0, Number(room.totalBeds || 0) - occupied);

                  return (
                    <div key={room.id} style={styles.row}>
                      <div>
                        <button style={styles.linkBtn} onClick={() => openRoomTenants(room.roomNo)}>
                          Room {room.roomNo}
                        </button>
                        <p style={styles.rowSub}>
                          Block: {room.block || '-'} | Type: {room.roomType || '-'}
                        </p>
                        <p style={styles.rowSub}>
                          Beds: {room.totalBeds} | Occupied: {occupied} | Available: {available}
                        </p>
                      </div>
                      <div style={styles.rowActions}>
                        <span style={styles.badge}>{available} Vacant</span>
                        <button style={styles.smallBtn} onClick={() => deleteItem('rooms', room.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'tenants' && (
          <div style={styles.grid2}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                {selectedRoom ? `Add Tenant for Room ${selectedRoom}` : 'Add Tenant'}
              </h2>

              <input style={styles.input} placeholder="Full Name" value={tenantForm.name} onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })} />
              <input style={styles.input} placeholder="Phone Number" value={tenantForm.phone} onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })} />
              <input style={styles.input} placeholder="Parent / Emergency Contact" value={tenantForm.parentPhone} onChange={(e) => setTenantForm({ ...tenantForm, parentPhone: e.target.value })} />
              <input style={styles.input} placeholder="Aadhaar / ID Number" value={tenantForm.idNumber} onChange={(e) => setTenantForm({ ...tenantForm, idNumber: e.target.value })} />
              <input style={styles.input} placeholder="Aadhaar Number" value={tenantForm.aadhaarNo} onChange={(e) => setTenantForm({ ...tenantForm, aadhaarNo: e.target.value })} />
              <input style={styles.input} type="date" value={tenantForm.joiningDate} onChange={(e) => setTenantForm({ ...tenantForm, joiningDate: e.target.value })} />
              <input style={styles.input} placeholder="Room Number" value={tenantForm.roomNo} onChange={(e) => setTenantForm({ ...tenantForm, roomNo: e.target.value })} />
              <input style={styles.input} placeholder="Bed Number" value={tenantForm.bedNo} onChange={(e) => setTenantForm({ ...tenantForm, bedNo: e.target.value })} />
              <input style={styles.input} placeholder="Monthly Fee" value={tenantForm.monthlyFee} onChange={(e) => setTenantForm({ ...tenantForm, monthlyFee: e.target.value })} />
              <input style={styles.input} placeholder="Security Deposit" value={tenantForm.securityDeposit} onChange={(e) => setTenantForm({ ...tenantForm, securityDeposit: e.target.value })} />
              <input style={styles.input} placeholder="Advance Paid" value={tenantForm.advancePaid} onChange={(e) => setTenantForm({ ...tenantForm, advancePaid: e.target.value })} />
              <input style={styles.input} placeholder="Address" value={tenantForm.address} onChange={(e) => setTenantForm({ ...tenantForm, address: e.target.value })} />
              <textarea style={styles.textarea} placeholder="Notes" value={tenantForm.notes} onChange={(e) => setTenantForm({ ...tenantForm, notes: e.target.value })} />
              <select style={styles.select} value={tenantForm.status} onChange={(e) => setTenantForm({ ...tenantForm, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <button style={styles.primaryBtn} onClick={addTenant}>Save Tenant</button>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Tenant List</h2>
              <input
                style={styles.input}
                placeholder="Search name / room / phone"
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
              />

              {selectedRoom ? (
                <button style={styles.smallBtn} onClick={() => setSelectedRoom('')}>
                  Show All Tenants
                </button>
              ) : null}

              {filteredTenants.length === 0 ? (
                <p style={styles.empty}>No tenants yet</p>
              ) : (
                filteredTenants.map((tenant) => (
                  <div key={tenant.id} style={styles.row}>
                    <div style={{ flex: 1 }}>
                      <button style={styles.linkBtn} onClick={() => openTenantFees(tenant.name)}>
                        {tenant.name}
                      </button>
                      <p style={styles.rowSub}>
                        {tenant.phone || 'No phone'} | Room {tenant.roomNo}
                      </p>

                      {openTenantId === tenant.id && (
                        <div style={{ marginTop: 10 }}>
                          <p style={styles.rowSub}>Bed No: {tenant.bedNo || '-'}</p>
                          <p style={styles.rowSub}>Parent Phone: {tenant.parentPhone || '-'}</p>
                          <p style={styles.rowSub}>Joining Date: {tenant.joiningDate || '-'}</p>
                          <p style={styles.rowSub}>Status: {tenant.status || 'Active'}</p>
                          <p style={styles.rowSub}>Monthly Fee: {formatCurrency(tenant.monthlyFee || 0)}</p>
                          <p style={styles.rowSub}>Security Deposit: {formatCurrency(tenant.securityDeposit || 0)}</p>
                          <p style={styles.rowSub}>Aadhaar No: {tenant.aadhaarNo || '-'}</p>
                          <p style={styles.rowSub}>Address: {tenant.address || '-'}</p>
                          <p style={styles.rowSub}>Notes: {tenant.notes || '-'}</p>
                        </div>
                      )}
                    </div>

                    <div style={styles.rowActions}>
                      <button
                        style={styles.smallBtn}
                        onClick={() => setOpenTenantId(openTenantId === tenant.id ? '' : tenant.id)}
                      >
                        {openTenantId === tenant.id ? 'Hide Details' : 'Details'}
                      </button>

                      <button
                        style={styles.smallBtn}
                        onClick={() => deleteTenantWithRelatedData(tenant)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'fees' && (
          <div style={styles.grid2}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Add Monthly Fee</h2>
              <select
                style={styles.select}
                value={feeForm.tenantName}
                onChange={(e) => {
                  setFeeForm({ ...feeForm, tenantName: e.target.value });
                  setSelectedFeeTenant(e.target.value);
                }}
              >
                <option value="">Select Tenant</option>
                {tenantNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              <input
                style={styles.input}
                type="date"
                value={feeForm.monthDate}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  const formattedMonth = selectedDate
                    ? new Date(selectedDate).toLocaleString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })
                    : '';
                  setFeeForm({ ...feeForm, monthDate: selectedDate, month: formattedMonth });
                }}
              />

              <input style={styles.input} placeholder="Total Amount" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} />
              <input style={styles.input} placeholder="Paid Amount" value={feeForm.paidAmount} onChange={(e) => setFeeForm({ ...feeForm, paidAmount: e.target.value })} />
              <input style={styles.input} type="date" value={feeForm.dueDate} onChange={(e) => setFeeForm({ ...feeForm, dueDate: e.target.value })} />
              <input style={styles.input} type="date" value={feeForm.paymentDate} onChange={(e) => setFeeForm({ ...feeForm, paymentDate: e.target.value })} />
              <select style={styles.select} value={feeForm.paymentMethod} onChange={(e) => setFeeForm({ ...feeForm, paymentMethod: e.target.value })}>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
              <textarea style={styles.textarea} placeholder="Remarks" value={feeForm.remarks} onChange={(e) => setFeeForm({ ...feeForm, remarks: e.target.value })} />
              <select style={styles.select} value={feeForm.status} onChange={(e) => setFeeForm({ ...feeForm, status: e.target.value })}>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partial">Partial</option>
              </select>

              <button style={styles.primaryBtn} onClick={addFee}>Add Fee Record</button>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Fee Records</h2>
              <input
                style={styles.input}
                placeholder="Search tenant / month / status"
                value={feeSearch}
                onChange={(e) => setFeeSearch(e.target.value)}
              />

              {displayedFeeRecords.length === 0 ? (
                <p style={styles.empty}>No fee records</p>
              ) : (
                displayedFeeRecords.map((fee) => (
                  <div key={fee.id} style={styles.row}>
                    <div>
                      <strong>{fee.tenantName}</strong>
                      <p style={styles.rowSub}>
                        Month: {fee.month} | Total: {formatCurrency(fee.amount)} | Paid: {formatCurrency(fee.paidAmount || 0)} | Pending: {formatCurrency(fee.dueAmount || 0)}
                      </p>
                    </div>
                    <div style={styles.rowActions}>
                      <span
                        style={{
                          ...styles.badge,
                          ...(fee.status === 'Paid'
                            ? styles.greenBadge
                            : fee.status === 'Partial'
                            ? styles.orangeBadge
                            : styles.redBadge),
                        }}
                      >
                        {fee.status}
                      </span>
                      <button style={styles.smallBtn} onClick={() => toggleFeeStatus(fee.id, fee.status, fee.amount)}>
                        Toggle
                      </button>
                      <button style={styles.smallBtn} onClick={() => deleteItem('fees', fee.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'complaints' && (
          <div style={styles.grid2}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Complaint Box</h2>
              <select
                style={styles.select}
                value={complaintForm.tenantName}
                onChange={(e) => {
                  const tenantName = e.target.value;
                  const found = currentTenants.find((t) => t.name === tenantName);
                  setComplaintForm({
                    ...complaintForm,
                    tenantName,
                    roomNo: found?.roomNo || '',
                  });
                }}
              >
                <option value="">Select Tenant</option>
                {tenantNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              <input style={styles.input} placeholder="Room Number" value={complaintForm.roomNo} onChange={(e) => setComplaintForm({ ...complaintForm, roomNo: e.target.value })} />
              <select style={styles.select} value={complaintForm.type} onChange={(e) => setComplaintForm({ ...complaintForm, type: e.target.value })}>
                <option value="Water">Water</option>
                <option value="Fan">Fan</option>
                <option value="WiFi">WiFi</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Food">Food</option>
                <option value="Electricity">Electricity</option>
              </select>
              <input style={styles.input} type="date" value={complaintForm.date} onChange={(e) => setComplaintForm({ ...complaintForm, date: e.target.value })} />
              <select style={styles.select} value={complaintForm.priority} onChange={(e) => setComplaintForm({ ...complaintForm, priority: e.target.value })}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <textarea style={styles.textarea} placeholder="Write complaint here" value={complaintForm.text} onChange={(e) => setComplaintForm({ ...complaintForm, text: e.target.value })} />
              <button style={styles.primaryBtn} onClick={addComplaint}>Add Complaint</button>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Complaint Tracker</h2>
              <input
                style={styles.input}
                placeholder="Search tenant / room / type / status"
                value={complaintSearch}
                onChange={(e) => setComplaintSearch(e.target.value)}
              />

              {displayedComplaints.length === 0 ? (
                <p style={styles.empty}>No complaints yet</p>
              ) : (
                displayedComplaints.map((item) => (
                  <div key={item.id} style={styles.row}>
                    <div>
                      <strong>{item.tenantName}</strong>
                      <p style={styles.rowSub}>
                        Room {item.roomNo || '-'} | {item.type} | {item.priority}
                      </p>
                      <p style={styles.rowSub}>{item.text}</p>
                    </div>
                    <div style={styles.rowActions}>
                      <span
                        style={{
                          ...styles.badge,
                          ...(item.status === 'Resolved' ? styles.greenBadge : styles.redBadge),
                        }}
                      >
                        {item.status}
                      </span>
                      <button style={styles.smallBtn} onClick={() => toggleComplaintStatus(item.id, item.status)}>
                        Toggle
                      </button>
                      <button style={styles.smallBtn} onClick={() => deleteItem('complaints', item.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, onClick }) {
  return (
    <div
      style={{ ...styles.statCard, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <p style={styles.statTitle}>{title}</p>
      <h3 style={styles.statValue}>{value}</h3>
      <span style={styles.statSub}>{sub}</span>
    </div>
  );
}

const styles: any = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: 20,
    fontFamily: 'Arial, sans-serif',
    color: '#0f172a',
  },
  container: { maxWidth: 1400, margin: '0 auto' },
  hero: {
    background: 'linear-gradient(135deg,#0f172a,#334155)',
    borderRadius: 24,
    padding: 28,
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  heroRight: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  small: { margin: 0, fontSize: 12, letterSpacing: 3, color: '#cbd5e1' },
  smallDark: { margin: 0, fontSize: 12, letterSpacing: 3, color: '#64748b' },
  title: { margin: '10px 0', fontSize: 34 },
  subtitle: { margin: 0, color: '#cbd5e1', maxWidth: 650 },
  switchBox: {
    minWidth: 240,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: { fontSize: 14, color: '#e2e8f0' },
  select: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    fontSize: 14,
    marginBottom: 12,
    boxSizing: 'border-box',
  },
  tabs: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    background: 'white',
    padding: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  tab: {
    border: 'none',
    background: '#f1f5f9',
    padding: '12px 16px',
    borderRadius: 14,
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  activeTab: { background: '#0f172a', color: 'white' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    background: 'white',
    borderRadius: 20,
    padding: 20,
    boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
  },
  statTitle: { margin: 0, color: '#64748b' },
  statValue: { margin: '10px 0 4px', fontSize: 24 },
  statSub: { color: '#64748b', fontSize: 13 },
  collectionBanner: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
    gap: 16,
    marginBottom: 20,
  },
  collectionCard: {
    background: 'white',
    borderRadius: 20,
    padding: 20,
    boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
  },
  collectionTitle: { margin: 0, color: '#64748b', fontSize: 14 },
  collectionValue: { margin: '10px 0 6px', fontSize: 28, color: '#0f172a' },
  collectionSub: { color: '#64748b', fontSize: 13 },
  summaryRow: { margin: '6px 0 0', color: '#0f172a', fontSize: 14, fontWeight: 600 },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(420px,1fr))',
    gap: 16,
    marginBottom: 20,
  },
  card: {
    background: 'white',
    borderRadius: 20,
    padding: 20,
    boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
  },
  cardTitle: { marginTop: 0, marginBottom: 16 },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    fontSize: 14,
    marginBottom: 12,
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    minHeight: 110,
    padding: 12,
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    fontSize: 14,
    marginBottom: 12,
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: 'none',
    background: '#0f172a',
    color: 'white',
    fontWeight: 700,
    cursor: 'pointer',
  },
  logoutBtn: {
    padding: '12px 16px',
    borderRadius: 12,
    border: 'none',
    background: '#ea580c',
    color: 'white',
    fontWeight: 700,
    cursor: 'pointer',
    height: 46,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  rowSub: { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  rowActions: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  badge: {
    background: '#e2e8f0',
    color: '#334155',
    borderRadius: 999,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  greenBadge: { background: '#dcfce7', color: '#166534' },
  redBadge: { background: '#fee2e2', color: '#991b1b' },
  orangeBadge: { background: '#ffedd5', color: '#9a3412' },
  smallBtn: {
    border: '1px solid #cbd5e1',
    background: 'white',
    padding: '8px 12px',
    borderRadius: 10,
    cursor: 'pointer',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#0f172a',
    textDecoration: 'underline',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
  },
  empty: { color: '#64748b', margin: 0 },
  authPage: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
    padding: 20,
    fontFamily: 'Arial, sans-serif',
  },
  authCard: {
    width: '100%',
    maxWidth: 420,
    background: 'white',
    padding: 24,
    borderRadius: 20,
    boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
  },
  authTitle: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 28,
    color: '#0f172a',
  },
  authSub: {
    marginTop: 0,
    marginBottom: 20,
    color: '#64748b',
  },
  errorText: {
    marginTop: 0,
    marginBottom: 12,
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: 600,
  },
};