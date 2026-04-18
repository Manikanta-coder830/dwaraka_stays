import { useEffect, useMemo, useState, type CSSProperties } from 'react';
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

type Room = {
  id: string;
  hostel: string;
  roomNo: string;
  totalBeds: number | string;
  occupiedBeds: number | string;
  createdAt?: number;
};

type Tenant = {
  id: string;
  hostel: string;
  name: string;
  phone: string;
  parentPhone: string;
  roomNo: string;
  bedNo: string;
  monthlyFee: string;
  securityDeposit: string;
  createdAt?: number;
};

type Fee = {
  id: string;
  hostel: string;
  tenantName: string;
  month: string;
  amount: string;
  status: 'Paid' | 'Unpaid';
  paidDate?: string;
  createdAt?: number;
};

type Complaint = {
  id: string;
  hostel: string;
  tenantName: string;
  type: string;
  text: string;
  status: 'Pending' | 'Solved';
  createdAt?: number;
};

type OwnerMap = {
  id: string;
  email: string;
  hostel: string;
};

type StatCardProps = {
  title: string;
  value: number | string;
  sub: string;
  onClick?: () => void;
};

export default function App() {
  const [selectedHostel, setSelectedHostel] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [activeTab, setActiveTab] = useState('rooms');

  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerHostel, setOwnerHostel] = useState('');
  const [ownerError, setOwnerError] = useState('');

  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  const [selectedFeeTenant, setSelectedFeeTenant] = useState('');
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [showVacantOnly, setShowVacantOnly] = useState(false);

  const [roomForm, setRoomForm] = useState({
    roomNo: '',
    totalBeds: '',
    occupiedBeds: '',
  });

  const [tenantForm, setTenantForm] = useState({
    name: '',
    phone: '',
    parentPhone: '',
    roomNo: '',
    bedNo: '',
    monthlyFee: '',
    securityDeposit: '',
  });

  const [feeForm, setFeeForm] = useState({
    tenantName: '',
    month: '',
    monthDate: '',
    amount: '',
    status: 'Unpaid' as 'Paid' | 'Unpaid',
  });

  const [complaintForm, setComplaintForm] = useState({
    tenantName: '',
    type: 'Water',
    text: '',
    status: 'Pending' as 'Pending' | 'Solved',
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);

      if (!u?.email) {
        setOwnerHostel('');
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
          setOwnerHostel('');
          setSelectedHostel('');
          setOwnerError('No hostel assigned for this login.');
          await signOut(auth);
        } else {
          const ownerData = snapshot.docs[0].data() as Omit<OwnerMap, 'id'>;
          setOwnerHostel(ownerData.hostel);
          setSelectedHostel(ownerData.hostel);
        }
      } catch {
        setOwnerHostel('');
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
        setRooms(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Room, 'id'>),
          }))
        );
      }
    );

    const unsubTenants = onSnapshot(
      query(collection(db, 'tenants'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setTenants(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Tenant, 'id'>),
          }))
        );
      }
    );

    const unsubFees = onSnapshot(
      query(collection(db, 'fees'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setFees(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Fee, 'id'>),
          }))
        );
      }
    );

    const unsubComplaints = onSnapshot(
      query(collection(db, 'complaints'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setComplaints(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Complaint, 'id'>),
          }))
        );
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

    setTenantForm((prev) => ({ ...prev, roomNo: '' }));
    setFeeForm({
      tenantName: '',
      month: '',
      monthDate: '',
      amount: '',
      status: 'Unpaid',
    });
    setComplaintForm({
      tenantName: '',
      type: 'Water',
      text: '',
      status: 'Pending',
    });
  }, [selectedHostel]);

  const currentRooms = useMemo(
    () => rooms.filter((item) => item.hostel === selectedHostel),
    [rooms, selectedHostel]
  );

  const currentTenants = useMemo(
    () => tenants.filter((item) => item.hostel === selectedHostel),
    [tenants, selectedHostel]
  );

  const currentFees = useMemo(
    () => fees.filter((item) => item.hostel === selectedHostel),
    [fees, selectedHostel]
  );

  const currentComplaints = useMemo(
    () => complaints.filter((item) => item.hostel === selectedHostel),
    [complaints, selectedHostel]
  );

  const filteredTenants = useMemo(() => {
    if (!selectedRoom) return currentTenants;
    return currentTenants.filter((item) => item.roomNo === selectedRoom);
  }, [currentTenants, selectedRoom]);

  const tenantNames = useMemo(
    () => currentTenants.map((item) => item.name).filter(Boolean),
    [currentTenants]
  );

  const selectedTenantFeeRecords = useMemo(() => {
    if (!selectedFeeTenant) return [];
    return currentFees
      .filter((fee) => fee.tenantName === selectedFeeTenant)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  }, [currentFees, selectedFeeTenant]);

  const displayedFeeRecords = useMemo(() => {
    const base = selectedFeeTenant ? selectedTenantFeeRecords : currentFees;
    return showUnpaidOnly ? base.filter((f) => f.status === 'Unpaid') : base;
  }, [selectedTenantFeeRecords, currentFees, selectedFeeTenant, showUnpaidOnly]);

  const displayedRooms = useMemo(() => {
    return showVacantOnly
      ? currentRooms.filter(
          (room) => Number(room.totalBeds) - Number(room.occupiedBeds) > 0
        )
      : currentRooms;
  }, [currentRooms, showVacantOnly]);

  const monthlyCollectedSummary = useMemo(() => {
    const monthTotals: Record<string, number> = {};

    currentFees.forEach((fee) => {
      if (fee.status === 'Paid') {
        const amount = Number(fee.amount || 0);
        monthTotals[fee.month] = (monthTotals[fee.month] || 0) + amount;
      }
    });

    return Object.entries(monthTotals)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, total]) => ({ month, total }));
  }, [currentFees]);

  const latestCollectedMonth = monthlyCollectedSummary[0];

  const stats = useMemo(() => {
    const totalRooms = currentRooms.length;
    const totalBeds = currentRooms.reduce(
      (sum, item) => sum + Number(item.totalBeds || 0),
      0
    );
    const occupiedBeds = currentRooms.reduce(
      (sum, item) => sum + Number(item.occupiedBeds || 0),
      0
    );
    const vacantBeds = totalBeds - occupiedBeds;
    const pendingFees = currentFees.filter(
      (item) => item.status === 'Unpaid'
    ).length;
    const pendingComplaints = currentComplaints.filter(
      (item) => item.status === 'Pending'
    ).length;

    return {
      totalRooms,
      totalBeds,
      occupiedBeds,
      vacantBeds,
      totalTenants: currentTenants.length,
      pendingFees,
      pendingComplaints,
    };
  }, [currentRooms, currentTenants, currentFees, currentComplaints]);

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
    setOwnerHostel('');
    setSelectedHostel('');
  };

  const addRoom = async () => {
    if (!roomForm.roomNo || !roomForm.totalBeds) return;

    await addDoc(collection(db, 'rooms'), {
      hostel: selectedHostel,
      roomNo: roomForm.roomNo,
      totalBeds: Number(roomForm.totalBeds),
      occupiedBeds: Number(roomForm.occupiedBeds || 0),
      createdAt: Date.now(),
    });

    setRoomForm({ roomNo: '', totalBeds: '', occupiedBeds: '' });
  };

  const addTenant = async () => {
    if (!tenantForm.name || !tenantForm.roomNo || !tenantForm.bedNo) return;

    await addDoc(collection(db, 'tenants'), {
      hostel: selectedHostel,
      name: tenantForm.name,
      phone: tenantForm.phone,
      parentPhone: tenantForm.parentPhone,
      roomNo: tenantForm.roomNo,
      bedNo: tenantForm.bedNo,
      monthlyFee: tenantForm.monthlyFee,
      securityDeposit: tenantForm.securityDeposit,
      createdAt: Date.now(),
    });

    const roomMatch = currentRooms.find(
      (item) => item.roomNo === tenantForm.roomNo
    );
    if (roomMatch) {
      await updateDoc(doc(db, 'rooms', roomMatch.id), {
        occupiedBeds: Number(roomMatch.occupiedBeds || 0) + 1,
      });
    }

    setTenantForm({
      name: '',
      phone: '',
      parentPhone: '',
      roomNo: selectedRoom || '',
      bedNo: '',
      monthlyFee: '',
      securityDeposit: '',
    });
  };

  const addFee = async () => {
    if (!feeForm.tenantName || !feeForm.month || !feeForm.amount) return;

    await addDoc(collection(db, 'fees'), {
      hostel: selectedHostel,
      tenantName: feeForm.tenantName,
      month: feeForm.month,
      amount: feeForm.amount,
      status: feeForm.status,
      paidDate:
        feeForm.status === 'Paid' ? new Date().toLocaleDateString() : '',
      createdAt: Date.now(),
    });

    setSelectedFeeTenant(feeForm.tenantName);

    setFeeForm({
      tenantName: feeForm.tenantName,
      month: '',
      monthDate: '',
      amount: '',
      status: 'Unpaid',
    });
  };

  const addComplaint = async () => {
    if (!complaintForm.tenantName || !complaintForm.text) return;

    await addDoc(collection(db, 'complaints'), {
      hostel: selectedHostel,
      tenantName: complaintForm.tenantName,
      type: complaintForm.type,
      text: complaintForm.text,
      status: complaintForm.status,
      createdAt: Date.now(),
    });

    setComplaintForm({
      tenantName: '',
      type: 'Water',
      text: '',
      status: 'Pending',
    });
  };

  const toggleFeeStatus = async (
    id: string,
    currentStatus: 'Paid' | 'Unpaid'
  ) => {
    const newStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';

    await updateDoc(doc(db, 'fees', id), {
      status: newStatus,
      paidDate: newStatus === 'Paid' ? new Date().toLocaleDateString() : '',
    });
  };

  const toggleComplaintStatus = async (
    id: string,
    currentStatus: 'Pending' | 'Solved'
  ) => {
    await updateDoc(doc(db, 'complaints', id), {
      status: currentStatus === 'Pending' ? 'Solved' : 'Pending',
    });
  };

  const deleteItem = async (collectionName: string, id: string) => {
    await deleteDoc(doc(db, collectionName, id));
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

          {ownerError ? (
            <p style={styles.errorText}>{ownerError}</p>
          ) : null}

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
              Logged in hostel: {ownerHostel || selectedHostel}
            </p>
          </div>

          <div style={styles.heroRight}>
            <div style={styles.switchBox}>
              <label style={styles.label}>Assigned Hostel</label>
              <input
                style={styles.readOnlyBox}
                value={selectedHostel}
                readOnly
              />
            </div>

            <button style={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <StatCard
            title="Rooms"
            value={stats.totalRooms}
            sub={`Beds: ${stats.totalBeds}`}
          />
          <StatCard
            title="Tenants"
            value={stats.totalTenants}
            sub="Saved online"
          />
          <StatCard
            title="Vacant Beds"
            value={stats.vacantBeds}
            sub={`Occupied: ${stats.occupiedBeds}`}
            onClick={() => {
              setActiveTab('rooms');
              setShowVacantOnly(true);
              setShowUnpaidOnly(false);
            }}
          />
          <StatCard
            title="Pending Fees"
            value={stats.pendingFees}
            sub={`Complaints: ${stats.pendingComplaints}`}
            onClick={() => {
              setActiveTab('fees');
              setShowUnpaidOnly(true);
              setShowVacantOnly(false);
            }}
          />
        </div>

        <div style={styles.collectionBanner}>
          <div style={styles.collectionCard}>
            <p style={styles.collectionTitle}>Total Collected</p>
            <h3 style={styles.collectionValue}>
              ₹{latestCollectedMonth ? latestCollectedMonth.total : 0}
            </h3>
            <span style={styles.collectionSub}>
              {latestCollectedMonth
                ? `${latestCollectedMonth.month}`
                : 'No paid records yet'}
            </span>
          </div>

          <div style={styles.collectionCard}>
            <p style={styles.collectionTitle}>Collection Summary</p>
            {monthlyCollectedSummary.length === 0 ? (
              <span style={styles.collectionSub}>No paid data yet</span>
            ) : (
              monthlyCollectedSummary.slice(0, 3).map((item) => (
                <p key={item.month} style={styles.summaryRow}>
                  {item.month}: ₹{item.total}
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
              onClick={() => {
                setActiveTab(key);
                if (key !== 'fees') setShowUnpaidOnly(false);
                if (key !== 'rooms') setShowVacantOnly(false);
              }}
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
              <input
                style={styles.input}
                placeholder="Room Number"
                value={roomForm.roomNo}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, roomNo: e.target.value })
                }
              />
              <input
                style={styles.input}
                type="number"
                placeholder="Total Beds"
                value={roomForm.totalBeds}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, totalBeds: e.target.value })
                }
              />
              <input
                style={styles.input}
                type="number"
                placeholder="Occupied Beds"
                value={roomForm.occupiedBeds}
                onChange={(e) =>
                  setRoomForm({ ...roomForm, occupiedBeds: e.target.value })
                }
              />
              <button style={styles.primaryBtn} onClick={addRoom}>
                Add Room
              </button>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Room Availability</h2>
              {showVacantOnly ? (
                <p style={styles.filterNote}>Showing only rooms with vacant beds</p>
              ) : null}

              {displayedRooms.length === 0 ? (
                <p style={styles.empty}>
                  {showVacantOnly ? 'No rooms with vacancy' : 'No rooms yet'}
                </p>
              ) : (
                displayedRooms.map((room) => (
                  <div key={room.id} style={styles.row}>
                    <div>
                      <button
                        style={styles.linkBtn}
                        onClick={() => openRoomTenants(room.roomNo)}
                      >
                        Room {room.roomNo}
                      </button>
                      <p style={styles.rowSub}>
                        Beds: {room.totalBeds} | Occupied: {room.occupiedBeds}
                      </p>
                    </div>
                    <div style={styles.rowActions}>
                      <span style={styles.badge}>
                        {Number(room.totalBeds) - Number(room.occupiedBeds)} Vacant
                      </span>
                      <button
                        style={styles.smallBtn}
                        onClick={() => deleteItem('rooms', room.id)}
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

        {activeTab === 'tenants' && (
          <div style={styles.grid2}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                {selectedRoom
                  ? `Add Tenant for Room ${selectedRoom}`
                  : 'Add Tenant'}
              </h2>
              <input
                style={styles.input}
                placeholder="Tenant Name"
                value={tenantForm.name}
                onChange={(e) =>
                  setTenantForm({ ...tenantForm, name: e.target.value })
                }
              />
              <input
                style={styles.input}
                placeholder="Phone Number"
                value={tenantForm.phone}
                onChange={(e) =>
                  setTenantForm({ ...tenantForm, phone: e.target.value })
                }
              />
              <input
                style={styles.input}
                placeholder="Parent Phone"
                value={tenantForm.parentPhone}
                onChange={(e) =>
                  setTenantForm({ ...tenantForm, parentPhone: e.target.value })
                }
              />
              <input
                style={styles.input}
                placeholder="Room Number"
                value={tenantForm.roomNo}
                onChange={(e) =>
                  setTenantForm({ ...tenantForm, roomNo: e.target.value })
                }
              />
              <input
                style={styles.input}
                placeholder="Bed Number"
                value={tenantForm.bedNo}
                onChange={(e) =>
                  setTenantForm({ ...tenantForm, bedNo: e.target.value })
                }
              />
              <input
                style={styles.input}
                placeholder="Monthly Fee"
                value={tenantForm.monthlyFee}
                onChange={(e) =>
                  setTenantForm({ ...tenantForm, monthlyFee: e.target.value })
                }
              />
              <input
                style={styles.input}
                placeholder="Security Deposit"
                value={tenantForm.securityDeposit}
                onChange={(e) =>
                  setTenantForm({ ...tenantForm, securityDeposit: e.target.value })
                }
              />
              <button style={styles.primaryBtn} onClick={addTenant}>
                Save Tenant
              </button>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Tenant List</h2>
              {selectedRoom ? (
                <button
                  style={styles.smallBtn}
                  onClick={() => setSelectedRoom('')}
                >
                  Show All Tenants
                </button>
              ) : null}

              {filteredTenants.length === 0 ? (
                <p style={styles.empty}>No tenants yet</p>
              ) : (
                filteredTenants.map((tenant) => (
                  <div key={tenant.id} style={styles.row}>
                    <div>
                      <button
                        style={styles.linkBtn}
                        onClick={() => openTenantFees(tenant.name)}
                      >
                        {tenant.name}
                      </button>
                      <p style={styles.rowSub}>
                        {tenant.phone || 'No phone'} | Room {tenant.roomNo} | Bed {tenant.bedNo}
                      </p>
                      <p style={styles.rowSub}>
                        Monthly Fee: ₹{tenant.monthlyFee || 0} | Security Deposit: ₹
                        {tenant.securityDeposit || 0}
                      </p>
                    </div>

                    <button
                      style={styles.smallBtn}
                      onClick={() => deleteItem('tenants', tenant.id)}
                    >
                      Delete
                    </button>
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
                  setShowUnpaidOnly(false);
                }}
              >
                <option value="">Select Tenant</option>
                {tenantNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
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

                  setFeeForm({
                    ...feeForm,
                    monthDate: selectedDate,
                    month: formattedMonth,
                  });
                }}
              />

              <input
                style={styles.input}
                placeholder="Amount"
                value={feeForm.amount}
                onChange={(e) =>
                  setFeeForm({ ...feeForm, amount: e.target.value })
                }
              />

              <select
                style={styles.select}
                value={feeForm.status}
                onChange={(e) =>
                  setFeeForm({
                    ...feeForm,
                    status: e.target.value as 'Paid' | 'Unpaid',
                  })
                }
              >
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>

              <button style={styles.primaryBtn} onClick={addFee}>
                Add Fee Record
              </button>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Fee Records</h2>

              {showUnpaidOnly ? (
                <p style={styles.filterNote}>Showing only unpaid fee records</p>
              ) : null}

              {!selectedFeeTenant && !showUnpaidOnly ? (
                <p style={styles.empty}>
                  Select a tenant to see monthly fee history
                </p>
              ) : displayedFeeRecords.length === 0 ? (
                <p style={styles.empty}>
                  {showUnpaidOnly
                    ? 'No unpaid fee records'
                    : `No monthly fee records for ${selectedFeeTenant}`}
                </p>
              ) : (
                displayedFeeRecords.map((fee) => (
                  <div key={fee.id} style={styles.row}>
                    <div>
                      <strong>{fee.tenantName}</strong>
                      <p style={styles.rowSub}>
                        Month: {fee.month} | ₹{fee.amount} | Paid Date:{' '}
                        {fee.paidDate || 'Not paid yet'}
                      </p>
                    </div>

                    <div style={styles.rowActions}>
                      <span
                        style={{
                          ...styles.badge,
                          ...(fee.status === 'Paid'
                            ? styles.greenBadge
                            : styles.redBadge),
                        }}
                      >
                        {fee.status}
                      </span>

                      <button
                        style={styles.smallBtn}
                        onClick={() => toggleFeeStatus(fee.id, fee.status)}
                      >
                        Toggle
                      </button>

                      <button
                        style={styles.smallBtn}
                        onClick={() => deleteItem('fees', fee.id)}
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

        {activeTab === 'complaints' && (
          <div style={styles.grid2}>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Complaint Box</h2>
              <select
                style={styles.select}
                value={complaintForm.tenantName}
                onChange={(e) =>
                  setComplaintForm({
                    ...complaintForm,
                    tenantName: e.target.value,
                  })
                }
              >
                <option value="">Select Tenant</option>
                {tenantNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                style={styles.select}
                value={complaintForm.type}
                onChange={(e) =>
                  setComplaintForm({ ...complaintForm, type: e.target.value })
                }
              >
                <option value="Water">Water</option>
                <option value="Fan">Fan</option>
                <option value="WiFi">WiFi</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Food">Food</option>
              </select>
              <textarea
                style={styles.textarea}
                placeholder="Write complaint here"
                value={complaintForm.text}
                onChange={(e) =>
                  setComplaintForm({ ...complaintForm, text: e.target.value })
                }
              />
              <button style={styles.primaryBtn} onClick={addComplaint}>
                Add Complaint
              </button>
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Complaint Tracker</h2>
              {currentComplaints.length === 0 ? (
                <p style={styles.empty}>No complaints yet</p>
              ) : (
                currentComplaints.map((item) => (
                  <div key={item.id} style={styles.row}>
                    <div>
                      <strong>{item.tenantName}</strong>
                      <p style={styles.rowSub}>
                        {item.type} | {item.text}
                      </p>
                    </div>
                    <div style={styles.rowActions}>
                      <span
                        style={{
                          ...styles.badge,
                          ...(item.status === 'Solved'
                            ? styles.greenBadge
                            : styles.redBadge),
                        }}
                      >
                        {item.status}
                      </span>
                      <button
                        style={styles.smallBtn}
                        onClick={() =>
                          toggleComplaintStatus(item.id, item.status)
                        }
                      >
                        Toggle
                      </button>
                      <button
                        style={styles.smallBtn}
                        onClick={() => deleteItem('complaints', item.id)}
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
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, onClick }: StatCardProps) {
  return (
    <div
      style={{
        ...styles.statCard,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <p style={styles.statTitle}>{title}</p>
      <h3 style={styles.statValue}>{value}</h3>
      <span style={styles.statSub}>{sub}</span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: 20,
    fontFamily: 'Arial, sans-serif',
    color: '#0f172a',
  },
  container: { maxWidth: 1200, margin: '0 auto' },
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
  },
  readOnlyBox: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: '1px solid #94a3b8',
    background: '#e2e8f0',
    fontSize: 14,
    color: '#0f172a',
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
    gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
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
  statValue: { margin: '10px 0 4px', fontSize: 30 },
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
  collectionTitle: {
    margin: 0,
    color: '#64748b',
    fontSize: 14,
  },
  collectionValue: {
    margin: '10px 0 6px',
    fontSize: 28,
    color: '#0f172a',
  },
  collectionSub: {
    color: '#64748b',
    fontSize: 13,
  },
  summaryRow: {
    margin: '6px 0 0',
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 600,
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
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
    background: '#dc2626',
    color: 'white',
    fontWeight: 700,
    cursor: 'pointer',
    height: 46,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  rowSub: { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  rowActions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
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
  },
  empty: { color: '#64748b', margin: 0 },
  filterNote: {
    marginTop: 0,
    marginBottom: 12,
    fontSize: 13,
    color: '#475569',
    fontWeight: 600,
  },
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