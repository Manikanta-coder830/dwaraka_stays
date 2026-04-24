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


const iplThemes = [
  { name: 'CSK', bg: 'linear-gradient(135deg,#fff200,#f59e0b)', fg: '#3b2200' },
  { name: 'MI', bg: 'linear-gradient(135deg,#004ba0,#00a3e0)', fg: '#ffffff' },
  { name: 'RR', bg: 'linear-gradient(135deg,#ec4899,#2563eb)', fg: '#ffffff' },
  { name: 'DC', bg: 'linear-gradient(135deg,#174ea6,#ef4444)', fg: '#ffffff' },
  { name: 'SRH', bg: 'linear-gradient(135deg,#f97316,#111827)', fg: '#fff7ed' },
  { name: 'LSG', bg: 'linear-gradient(135deg,#38bdf8,#f97316)', fg: '#082f49' },
  { name: 'KKR', bg: 'linear-gradient(135deg,#3b0764,#facc15)', fg: '#fff7ed' },
  { name: 'PBSK', bg: 'linear-gradient(135deg,#dc2626,#f8fafc)', fg: '#ffffff' },
  { name: 'GT', bg: 'linear-gradient(135deg,#0f172a,#d4af37)', fg: '#f8fafc' },
  { name: 'RCB', bg: 'linear-gradient(135deg,#ef4444,#000000)', fg: '#ffffff' },
];

function getIplTheme(index: number) {
  return iplThemes[index % iplThemes.length];
}

function formatCurrency(amount: any) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}


function formatDatePretty(value: any) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTimePretty(value: any) {
  if (!value) return '-';
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function monthToTimestamp(monthLabel: string) {
  const d = new Date(`1 ${monthLabel}`);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export default function App() {
  const [selectedHostel, setSelectedHostel] = useState('Dwaraka 1');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [activeTab, setActiveTab] = useState('rooms');
  const [openTenantId, setOpenTenantId] = useState('');
  const [openDeletedTenantId, setOpenDeletedTenantId] = useState('');
  const [selectedTenantProfile, setSelectedTenantProfile] = useState<any>(null);

  const [user, setUser] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showIntroVideo, setShowIntroVideo] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerHostels, setOwnerHostels] = useState<string[]>([]);
  const [ownerError, setOwnerError] = useState('');

  const [rooms, setRooms] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [deletedTenants, setDeletedTenants] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);

  const [selectedFeeTenant, setSelectedFeeTenant] = useState('');
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [showVacantOnly, setShowVacantOnly] = useState(false);
  const [showRoomNumbers, setShowRoomNumbers] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantStatusFilter, setTenantStatusFilter] = useState('All');
  const [feeStatusFilter, setFeeStatusFilter] = useState('All');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('All');
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
    const introTimer = setTimeout(() => {
      setShowIntroVideo(false);
    }, 5000);

    return () => clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    if (!isAdminMode && ['fees', 'history', 'activity'].includes(activeTab)) {
      setActiveTab('rooms');
    }
  }, [isAdminMode, activeTab]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);

      if (!u?.email) {
        setIsAdminMode(false);
        setOwnerHostels([]);
        setSelectedHostel('Dwaraka 1');
        setOwnerError('');
        return;
      }

      setIsAdminMode(true);

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
    if (!selectedHostel) {
      setRooms([]);
      setTenants([]);
      setDeletedTenants([]);
      setFees([]);
      setComplaints([]);
      return;
    }

    const unsubRooms = onSnapshot(
      query(collection(db, 'rooms'), orderBy('createdAt', 'desc')),
      (snapshot) => setRooms(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubTenants = onSnapshot(
      query(collection(db, 'tenants'), orderBy('createdAt', 'desc')),
      (snapshot) => setTenants(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubDeletedTenants = onSnapshot(
      query(collection(db, 'deletedTenants'), orderBy('deletedAt', 'desc')),
      (snapshot) => setDeletedTenants(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubFees = onSnapshot(
      query(collection(db, 'fees'), orderBy('createdAt', 'desc')),
      (snapshot) => setFees(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubComplaints = onSnapshot(
      query(collection(db, 'complaints'), orderBy('createdAt', 'desc')),
      (snapshot) => setComplaints(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubRooms();
      unsubTenants();
      unsubDeletedTenants();
      unsubFees();
      unsubComplaints();
    };
  }, [selectedHostel]);

  useEffect(() => {
    setSelectedRoom('');
    setSelectedFeeTenant('');
    setShowUnpaidOnly(false);
    setShowVacantOnly(false);
    setShowRoomNumbers(false);
    setTenantSearch('');
    setTenantStatusFilter('All');
    setFeeStatusFilter('All');
    setComplaintStatusFilter('All');
    setRoomSearch('');
    setFeeSearch('');
    setComplaintSearch('');
    setOpenTenantId('');
    setOpenDeletedTenantId('');
    setSelectedTenantProfile(null);
  }, [selectedHostel]);

  const currentRooms = useMemo(
    () => rooms.filter((item) => item.hostel === selectedHostel),
    [rooms, selectedHostel, ownerHostels]
  );

  const currentTenants = useMemo(
    () => tenants.filter((item) => item.hostel === selectedHostel),
    [tenants, selectedHostel, ownerHostels]
  );

  const currentDeletedTenants = useMemo(
    () => deletedTenants.filter((item) => item.hostel === selectedHostel),
    [deletedTenants, selectedHostel, ownerHostels]
  );

  const currentFees = useMemo(
    () => fees.filter((item) => item.hostel === selectedHostel),
    [fees, selectedHostel, ownerHostels]
  );

  const currentComplaints = useMemo(
    () => complaints.filter((item) => item.hostel === selectedHostel),
    [complaints, selectedHostel, ownerHostels]
  );

  const searchedRooms = useMemo(() => {
    const list = showVacantOnly
      ? currentRooms.filter((room) => {
          const occupied = currentTenants.filter((t) => t.roomNo === room.roomNo).length;
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

    if (selectedRoom) {
      list = list.filter((item) => item.roomNo === selectedRoom);
    }

    if (tenantStatusFilter !== 'All') {
      list = list.filter((item) => (item.status || 'Active') === tenantStatusFilter);
    }

    if (tenantSearch.trim()) {
      const q = tenantSearch.toLowerCase();
      list = list.filter((item) =>
        `${item.name} ${item.roomNo} ${item.phone} ${item.aadhaarNo || ''}`
          .toLowerCase()
          .includes(q)
      );
    }

    return list;
  }, [currentTenants, selectedRoom, tenantSearch, tenantStatusFilter]);

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

    if (feeStatusFilter !== 'All') {
      base = base.filter((f) => f.status === feeStatusFilter);
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
  }, [currentFees, selectedFeeTenant, showUnpaidOnly, feeSearch, feeStatusFilter]);

  const displayedComplaints = useMemo(() => {
    let list = currentComplaints;

    if (complaintStatusFilter !== 'All') {
      list = list.filter((c) => c.status === complaintStatusFilter);
    }

    if (complaintSearch.trim()) {
      const q = complaintSearch.toLowerCase();
      list = list.filter((c) =>
        `${c.tenantName} ${c.roomNo} ${c.type} ${c.status} ${c.text}`
          .toLowerCase()
          .includes(q)
      );
    }
    return list;
  }, [currentComplaints, complaintSearch, complaintStatusFilter]);

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
    setIsAdminMode(false);
    setOwnerHostels([]);
    setSelectedHostel('Dwaraka 1');
    setActiveTab('rooms');
  };

  const addRoom = async () => {
    if (!isAdminMode) return alert('Please login as admin to add rooms');
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
    if (!isAdminMode) return alert('Please login as admin to add tenants');
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
    if (!isAdminMode) return alert('Please login as admin to add fees');
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
    if (!isAdminMode) return alert('Please login as admin');
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
    if (!isAdminMode) return alert('Please login as admin');
    const newStatus = currentStatus === 'Resolved' ? 'Pending' : 'Resolved';

    await updateDoc(doc(db, 'complaints', id), {
      status: newStatus,
      resolvedDate: newStatus === 'Resolved' ? new Date().toLocaleDateString() : '',
    });
  };

  const deleteItem = async (collectionName: string, id: string) => {
    if (!isAdminMode) return alert('Please login as admin to delete');
    const ok = window.confirm('Are you sure you want to delete this record?');
    if (!ok) return;
    await deleteDoc(doc(db, collectionName, id));
    alert('Deleted successfully');
  };

  const deleteHistoryRecord = async (id: string) => {
    if (!isAdminMode) return alert('Please login as admin to delete history');
    const ok = window.confirm('Delete this history record permanently?');
    if (!ok) return;

    await deleteDoc(doc(db, 'deletedTenants', id));

    if (openDeletedTenantId === id) {
      setOpenDeletedTenantId('');
    }

    alert('History record deleted successfully.');
  };

  const deleteTenantWithRelatedData = async (tenant: any) => {
    if (!isAdminMode) return alert('Please login as admin to delete tenants');
    const ok = window.confirm(`Delete ${tenant.name} and save to history?`);
    if (!ok) return;

    try {
      const roomMatch = currentRooms.find((r) => r.roomNo === tenant.roomNo);

      await addDoc(collection(db, 'deletedTenants'), {
        ...tenant,
        originalTenantId: tenant.id,
        deletedAt: Date.now(),
        deletedDate: new Date().toLocaleString(),
      });

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

      alert('Tenant deleted and saved to history.');
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



  const activityFeed = useMemo(() => {
    const items = [
      ...currentTenants.slice(0, 5).map((t) => ({
        type: 'Tenant Added',
        title: t.name || 'Tenant',
        sub: `Room ${t.roomNo || '-'}`,
        time: Number(t.createdAt || 0),
      })),
      ...currentFees.slice(0, 5).map((f) => ({
        type: 'Fee Updated',
        title: f.tenantName || 'Tenant',
        sub: `${f.month || '-'} • ${formatCurrency(f.paidAmount || 0)} paid`,
        time: Number(f.createdAt || 0),
      })),
      ...currentDeletedTenants.slice(0, 5).map((t) => ({
        type: 'Tenant Deleted',
        title: t.name || 'Tenant',
        sub: `Room ${t.roomNo || '-'}`,
        time: Number(t.deletedAt || 0),
      })),
      ...currentComplaints.slice(0, 5).map((c) => ({
        type: 'Complaint',
        title: c.tenantName || 'Tenant',
        sub: `${c.type || '-'} • ${c.status || '-'}`,
        time: Number(c.createdAt || 0),
      })),
    ];

    return items
      .filter((i) => i.time)
      .sort((a, b) => b.time - a.time)
      .slice(0, 8);
  }, [currentTenants, currentFees, currentDeletedTenants, currentComplaints]);

  const monthlyChartData = useMemo(() => {
    const rows = monthlyCollectedSummary.slice(0, 6).reverse();
    const max = Math.max(...rows.map((r: any) => Number(r.total || 0)), 1);
    return rows.map((r: any) => ({
      ...r,
      percent: Math.max(6, Math.round((Number(r.total || 0) / max) * 100)),
    }));
  }, [monthlyCollectedSummary]);

  const dashboardCards = [
    { title: 'Total Rooms', value: stats.totalRooms, sub: `Beds: ${stats.totalBeds}`, teamIndex: 0, onClick: () => setActiveTab('rooms') },
    { title: 'Occupied Beds', value: stats.occupiedBeds, sub: `Vacant: ${stats.vacantBeds}`, teamIndex: 1 },
    { title: 'Vacant Beds', value: stats.vacantBeds, sub: 'Click to view', teamIndex: 2, onClick: () => {
      setActiveTab('rooms');
      setShowVacantOnly(true);
    } },
    { title: 'Total Tenants', value: stats.totalTenants, sub: 'Active tenants', teamIndex: 3, onClick: () => setActiveTab('tenants') },
    { title: 'Collected Fee', value: isAdminMode ? formatCurrency(currentMonthCollected) : 'Admin', sub: isAdminMode ? currentMonthLabel : 'Login required', teamIndex: 4 },
    { title: 'Pending Fee', value: isAdminMode ? formatCurrency(currentMonthPending) : 'Admin', sub: isAdminMode ? currentMonthLabel : 'Login required', teamIndex: 5, onClick: () => {
      if (isAdminMode) {
        setActiveTab('fees');
        setShowUnpaidOnly(true);
      } else {
        setActiveTab('adminLogin');
      }
    } },
    { title: 'Security Deposit', value: isAdminMode ? formatCurrency(totalSecurityDepositCollected) : 'Admin', sub: isAdminMode ? 'Collected' : 'Login required', teamIndex: 6 },
    { title: 'Deleted History', value: isAdminMode ? currentDeletedTenants.length : 'Admin', sub: isAdminMode ? 'Old tenants' : 'Login required', teamIndex: 7, onClick: () => setActiveTab(isAdminMode ? 'history' : 'adminLogin') },
    { title: 'Active Complaints', value: activeComplaints, sub: 'Open', teamIndex: 8, onClick: () => setActiveTab('complaints') },
    { title: 'Resolved Complaints', value: resolvedComplaints, sub: 'Closed', teamIndex: 9, onClick: () => setActiveTab('complaints') },
  ];


  const occupancyPercent = stats.totalBeds
    ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100)
    : 0;

  const feeCollectionPercent = currentMonthExpectedFee
    ? Math.round((currentMonthCollected / currentMonthExpectedFee) * 100)
    : 0;

  const alertCards = [
    {
      title: 'Vacant Beds',
      value: stats.vacantBeds,
      text: stats.vacantBeds > 0 ? 'Beds available for new tenants' : 'All beds are occupied',
      type: stats.vacantBeds > 0 ? 'good' : 'warn',
    },
    {
      title: 'Pending Fee',
      value: formatCurrency(currentMonthPending),
      text: currentMonthPending > 0 ? 'Collection follow-up needed' : 'No pending amount this month',
      type: currentMonthPending > 0 ? 'danger' : 'good',
    },
    {
      title: 'Complaints',
      value: activeComplaints,
      text: activeComplaints > 0 ? 'Open complaints pending' : 'No active complaints',
      type: activeComplaints > 0 ? 'warn' : 'good',
    },
  ];

  const downloadTenantCSV = () => {
    const rows = [
      ['Name', 'Phone', 'Parent Phone', 'Room', 'Bed', 'Joining Date', 'Monthly Fee', 'Security Deposit', 'Aadhaar No', 'Address', 'Status'],
      ...currentTenants.map((t) => [
        t.name || '',
        t.phone || '',
        t.parentPhone || '',
        t.roomNo || '',
        t.bedNo || '',
        t.joiningDate || '',
        t.monthlyFee || 0,
        t.securityDeposit || 0,
        t.aadhaarNo || '',
        t.address || '',
        t.status || 'Active',
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedHostel || 'hostel'}-tenant-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printMonthlyReport = () => {
    window.print();
  };


  if (showIntroVideo) {
    return (
      <div style={styles.introSplash}>
        <video
          style={styles.introVideo}
          autoPlay
          muted
          playsInline
          onEnded={() => setShowIntroVideo(false)}
        >
          <source src="/intro.mp4" type="video/mp4" />
        </video>

        <button style={styles.skipIntroBtn} onClick={() => setShowIntroVideo(false)}>
          Skip
        </button>
      </div>
    );
  }

  if (authLoading || ownerLoading) {
    return (
      <div style={styles.authPage}>
        <div style={styles.authCard}>
          <h2 style={styles.authTitle}>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.hero}>
          <span style={styles.heroWatermark}>DWARAKA</span>
          <div style={styles.heroBrand}>
            <img src="/dwaraka-logo.png" alt="Dwaraka Premium Stays" style={styles.dashboardLogo} />
            <div style={styles.heroTextBlock}>
              <p style={styles.small}>DWARAKA PREMIUM STAYS</p>
              <h1 style={styles.title}>
                <span style={styles.ogTitle}>DWARAKA</span>
                <span style={styles.titleSmall}></span>
              </h1>
              <p style={styles.subtitle}>
                Engineers PG • Premium Stays
              </p>
            </div>
          </div>

          <div style={{ ...styles.heroRight, position: 'relative', zIndex: 2 }}>
            <div style={styles.switchBox}>
              <label style={styles.label}>Select Hostel</label>
              <select
                style={styles.select}
                value={selectedHostel}
                onChange={(e) => setSelectedHostel(e.target.value)}
              >
                {(isAdminMode && ownerHostels.length ? ownerHostels : ['Dwaraka 1', 'Dwaraka 2', 'Dwaraka 3', 'Dwaraka 4']).map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {isAdminMode ? (
              <>
                <button style={styles.historyBtn} onClick={() => setActiveTab('history')}>
                  History
                </button>

                <button style={styles.reportBtn} onClick={downloadTenantCSV}>
                  Download CSV
                </button>

                <button style={styles.reportBtn} onClick={printMonthlyReport}>
                  Print Report
                </button>

                <button style={styles.logoutBtn} onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <button style={styles.loginTopBtn} onClick={() => setActiveTab('adminLogin')}>
                Admin Login
              </button>
            )}
          </div>
        </div>

        <div style={styles.statsGrid}>
          {dashboardCards.map((card) => (
            <StatCard
              key={card.title}
              title={card.title}
              value={card.value}
              sub={card.sub}
              teamIndex={card.teamIndex}
              onClick={card.onClick}
            />
          ))}
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


        <div style={styles.insightGrid}>
          <div style={styles.premiumPanel}>
            <h2 style={styles.royalPanelTitle}>Royal Dashboard Insights</h2>
            <div style={styles.chartItem}>
              <div style={styles.chartTop}>
                <span>Occupancy</span>
                <strong>{occupancyPercent}%</strong>
              </div>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${occupancyPercent}%` }} />
              </div>
              <p style={styles.panelSub}>{stats.occupiedBeds} occupied out of {stats.totalBeds} beds</p>
            </div>

            <div style={styles.chartItem}>
              <div style={styles.chartTop}>
                <span>Fee Collection</span>
                <strong>{feeCollectionPercent}%</strong>
              </div>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFillGold, width: `${feeCollectionPercent}%` }} />
              </div>
              <p style={styles.panelSub}>{formatCurrency(currentMonthCollected)} collected this month</p>
            </div>

            <h3 style={styles.miniGoldTitle}>Monthly Collection Chart</h3>
            {monthlyChartData.length === 0 ? (
              <p style={styles.panelSub}>No chart data yet</p>
            ) : (
              monthlyChartData.map((item: any) => (
                <div key={item.month} style={styles.barRow}>
                  <span style={styles.barLabel}>{item.month}</span>
                  <div style={styles.barTrack}>
                    <div style={{ ...styles.barFill, width: `${item.percent}%` }} />
                  </div>
                  <strong>{formatCurrency(item.total)}</strong>
                </div>
              ))
            )}
          </div>

          <div style={styles.premiumPanel}>
            <h2 style={styles.royalPanelTitle}>Smart Alerts</h2>
            {alertCards.map((alert) => (
              <div
                key={alert.title}
                style={{
                  ...styles.alertRow,
                  ...(alert.type === 'danger'
                    ? styles.alertDanger
                    : alert.type === 'warn'
                    ? styles.alertWarn
                    : styles.alertGood),
                }}
              >
                <div>
                  <strong>{alert.title}</strong>
                  <p style={styles.alertText}>{alert.text}</p>
                </div>
                <span style={styles.alertValue}>{alert.value}</span>
              </div>
            ))}          </div>
        </div>

        <div style={styles.tabs}>
          {[
            ['rooms', 'Rooms / Beds'],
            ['tenants', 'Tenant Details'],
            ...(isAdminMode ? [['fees', 'Monthly Fees']] : []),
            ['complaints', 'Complaints'],
            ...(isAdminMode ? [['history', 'Deleted History'], ['activity', 'Activity Timeline']] : []),
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


        {activeTab === 'adminLogin' && !isAdminMode && (
          <div style={styles.adminLoginGrid}>
            <div style={styles.publicRoyalCard}>
              <img src="/dwaraka-royal-bg.png" alt="Dwaraka Royal" style={styles.publicRoyalImage} />
            </div>

            <div style={{ ...styles.card, ...styles.royalFormCard }}>
              <h2 style={styles.cardTitle}>Admin Login</h2>
              <p style={styles.empty}>Login only required for adding/editing/deleting data.</p>

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
                Login as Admin
              </button>
            </div>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div style={styles.grid2}>
            {isAdminMode ? (
            <div style={{ ...styles.card, ...styles.royalFormCard }}>
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
            ) : (
              <div style={styles.publicRoyalCard}>
                <img src="/dwaraka-royal-bg.png" alt="Dwaraka Royal" style={styles.publicRoyalImage} />
                <div style={styles.publicRoyalOverlay}>
                  <h2>Public View</h2>
                  <p>Rooms are visible without login. Admin login is required to add, edit or delete rooms.</p>
                  <button style={styles.loginTopBtn} onClick={() => setActiveTab('adminLogin')}>
                    Admin Login
                  </button>
                </div>
              </div>
            )}

            <div style={{ ...styles.card, ...styles.royalListCard }}>
              <h2 style={styles.cardTitle}>Room Availability</h2>
              <input
                style={styles.input}
                placeholder="Search room / block / type"
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
              />

              <button
                style={styles.viewRoomsBtn}
                onClick={() => setShowRoomNumbers(!showRoomNumbers)}
              >
                {showRoomNumbers ? 'Hide Room Numbers' : 'View Room Numbers'}
              </button>

              {!showRoomNumbers && (
                <div style={styles.hiddenRoomNotice}>
                  Room numbers are hidden. Click <b>View Room Numbers</b> to see all rooms.
                </div>
              )}

              {showRoomNumbers && (
                <>
                  <h3 style={styles.miniTitle}>Room Visual Layout</h3>
                  <div style={styles.roomGrid}>
                    {searchedRooms.map((room) => {
                      const occupied = currentTenants.filter((t) => t.roomNo === room.roomNo).length;
                      const totalBeds = Number(room.totalBeds || 0);
                      return (
                        <button
                          key={`visual-${room.id}`}
                          style={styles.roomTile}
                          onClick={() => openRoomTenants(room.roomNo)}
                        >
                          <strong>Room {room.roomNo}</strong>
                          <div style={styles.bedDots}>
                            {Array.from({ length: totalBeds }).map((_, index) => (
                              <span
                                key={index}
                                style={{
                                  ...styles.bedDot,
                                  ...(index < occupied ? styles.bedOccupied : styles.bedVacant),
                                }}
                              />
                            ))}
                          </div>
                          <small>{occupied}/{totalBeds} filled</small>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {showRoomNumbers && searchedRooms.length === 0 ? (
                <p style={styles.empty}>No rooms yet</p>
              ) : showRoomNumbers ? (
                searchedRooms.map((room) => {
                  const occupied = currentTenants.filter((t) => t.roomNo === room.roomNo).length;
                  const available = Math.max(0, Number(room.totalBeds || 0) - occupied);

                  return (
                    <div key={room.id} style={styles.row}>
                      <div>
                        <button style={styles.linkBtn} onClick={() => openRoomTenants(room.roomNo)}>
                          {showRoomNumbers ? `Room ${room.roomNo}` : 'Room Hidden'}
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
                        {isAdminMode && (
                          <button style={styles.smallBtn} onClick={() => deleteItem('rooms', room.id)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : null}
            </div>
          </div>
        )}

        {activeTab === 'tenants' && (
          <div style={styles.grid2}>
            {isAdminMode ? (
            <div style={{ ...styles.card, ...styles.royalFormCard }}>
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
            ) : (
              <div style={{ ...styles.card, ...styles.royalFormCard }}>
                <h2 style={styles.cardTitle}>Tenant Public View</h2>
                <p style={styles.empty}>Tenant list can be viewed. Login as admin to add or delete tenants.</p>
              </div>
            )}

            <div style={{ ...styles.card, ...styles.royalListCard }}>
              <h2 style={styles.cardTitle}>Tenant List</h2>
              <input
                style={styles.input}
                placeholder="Search name / room / phone"
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
              />

              <select
                aria-label="Tenant Status Filter"
                style={styles.select}
                value={tenantStatusFilter}
                onChange={(e) => setTenantStatusFilter(e.target.value)}
              >
                <option value="All">All Tenants</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              {selectedRoom ? (
                <button style={styles.smallBtn} onClick={() => setSelectedRoom('')}>
                  Show All Tenants
                </button>
              ) : null}

              {filteredTenants.length === 0 ? (
                <p style={styles.empty}>No tenants yet</p>
              ) : (
                filteredTenants.map((tenant) => (
                  <div key={tenant.id} style={styles.tenantPremiumRow}>
                    <div style={{ flex: 1 }}>
                      <button style={styles.linkBtn} onClick={() => openTenantFees(tenant.name)}>
                        {tenant.name}
                      </button>
                      <p style={styles.rowSub}>
                        {tenant.phone || 'No phone'} | Room {tenant.roomNo}
                      </p>

                      {isAdminMode && selectedTenantProfile?.id === tenant.id && (
                        <div style={styles.inlineProfileCard}>
                          <div style={styles.inlineProfileHeader}>
                            <div style={styles.avatarCircleSmall}>
                              {String(tenant.name || 'T').slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <strong>{tenant.name}</strong>
                              <p style={styles.rowSub}>Room {tenant.roomNo || '-'} • Bed {tenant.bedNo || '-'}</p>
                            </div>
                          </div>

                          <div style={styles.inlineProfileGrid}>
                            <ProfileLine label="Phone" value={tenant.phone || '-'} />
                            <ProfileLine label="Parent Phone" value={tenant.parentPhone || '-'} />
                            <ProfileLine label="Joining Date" value={formatDatePretty(tenant.joiningDate)} />
                            <ProfileLine label="Status" value={tenant.status || 'Active'} />
                            <ProfileLine label="Monthly Fee" value={formatCurrency(tenant.monthlyFee || 0)} />
                            <ProfileLine label="Security Deposit" value={formatCurrency(tenant.securityDeposit || 0)} />
                            <ProfileLine label="Aadhaar No" value={tenant.aadhaarNo || '-'} />
                            <ProfileLine label="Address" value={tenant.address || '-'} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={styles.rowActions}>
                      {isAdminMode && (
                      <button
                        style={styles.profileBtn}
                        onClick={() =>
                          setSelectedTenantProfile(
                            selectedTenantProfile?.id === tenant.id ? null : tenant
                          )
                        }
                      >
                        {selectedTenantProfile?.id === tenant.id ? 'Hide Profile' : 'View Profile'}
                      </button>
                      )}

                      {isAdminMode && (
                        <button
                          style={styles.dangerBtn}
                          onClick={() => deleteTenantWithRelatedData(tenant)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {isAdminMode && activeTab === 'activity' && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Activity Timeline</h2>
            <p style={styles.empty}>All recent tenant, fee, complaint and deleted-history activities.</p>

            {activityFeed.length === 0 ? (
              <p style={styles.empty}>No activity yet</p>
            ) : (
              <div style={styles.activityBox}>
                {activityFeed.map((item, index) => (
                  <div key={`${item.type}-${item.time}-${index}`} style={styles.activityItem}>
                    <span style={styles.timelineDot} />
                    <div>
                      <strong>{item.type}</strong>
                      <p style={styles.activitySub}>{item.title} • {item.sub}</p>
                      <small style={styles.timelineTime}>{formatDateTimePretty(item.time)}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isAdminMode && activeTab === 'history' && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Deleted Tenant History</h2>

            {currentDeletedTenants.length === 0 ? (
              <p style={styles.empty}>No deleted tenant history</p>
            ) : (
              currentDeletedTenants.map((tenant) => (
                <div key={tenant.id} style={styles.historyRow}>
                  <div style={{ flex: 1 }}>
                    <strong>{tenant.name}</strong>
                    <p style={styles.rowSub}>
                      {tenant.phone || 'No phone'} | Room {tenant.roomNo || '-'}
                    </p>

                    {openDeletedTenantId === tenant.id && (
                      <div style={{ marginTop: 10 }}>
                        <p style={styles.rowSub}>Bed No: {tenant.bedNo || '-'}</p>
                        <p style={styles.rowSub}>Parent Phone: {tenant.parentPhone || '-'}</p>
                        <p style={styles.rowSub}>Joining Date: {tenant.joiningDate || '-'}</p>
                        <p style={styles.rowSub}>Status: {tenant.status || '-'}</p>
                        <p style={styles.rowSub}>
                          Monthly Fee: {formatCurrency(tenant.monthlyFee || 0)}
                        </p>
                        <p style={styles.rowSub}>
                          Security Deposit: {formatCurrency(tenant.securityDeposit || 0)}
                        </p>
                        <p style={styles.rowSub}>Aadhaar No: {tenant.aadhaarNo || '-'}</p>
                        <p style={styles.rowSub}>Address: {tenant.address || '-'}</p>
                        <p style={styles.rowSub}>Notes: {tenant.notes || '-'}</p>
                        <p style={styles.rowSub}>Deleted On: {tenant.deletedDate || '-'}</p>
                      </div>
                    )}
                  </div>

                  <div style={styles.rowActions}>
                    <button
                      style={styles.smallBtn}
                      onClick={() =>
                        setOpenDeletedTenantId(
                          openDeletedTenantId === tenant.id ? '' : tenant.id
                        )
                      }
                    >
                      {openDeletedTenantId === tenant.id ? 'Hide Details' : 'Details'}
                    </button>

                    <button
                      style={styles.dangerBtn}
                      onClick={() => deleteHistoryRecord(tenant.id)}
                    >
                      Delete History
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'fees' && (
          <div style={styles.grid2}>
            <div style={{ ...styles.card, ...styles.royalFormCard }}>
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

            <div style={{ ...styles.card, ...styles.royalListCard }}>
              <h2 style={styles.cardTitle}>Fee Records</h2>
              <input
                style={styles.input}
                placeholder="Search tenant / month / status"
                value={feeSearch}
                onChange={(e) => setFeeSearch(e.target.value)}
              />

              <select
                aria-label="Fee Status Filter"
                style={styles.select}
                value={feeStatusFilter}
                onChange={(e) => setFeeStatusFilter(e.target.value)}
              >
                <option value="All">All Fees</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Unpaid">Unpaid</option>
              </select>

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
                      {isAdminMode && (
                        <>
                          <button style={styles.smallBtn} onClick={() => toggleFeeStatus(fee.id, fee.status, fee.amount)}>
                            Toggle
                          </button>
                          <button style={styles.smallBtn} onClick={() => deleteItem('fees', fee.id)}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'complaints' && (
          <div style={styles.grid2}>
            <div style={{ ...styles.card, ...styles.royalFormCard }}>
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

            <div style={{ ...styles.card, ...styles.royalListCard }}>
              <h2 style={styles.cardTitle}>Complaint Tracker</h2>
              <input
                style={styles.input}
                placeholder="Search tenant / room / type / status"
                value={complaintSearch}
                onChange={(e) => setComplaintSearch(e.target.value)}
              />

              <select
                aria-label="Complaint Status Filter"
                style={styles.select}
                value={complaintStatusFilter}
                onChange={(e) => setComplaintStatusFilter(e.target.value)}
              >
                <option value="All">All Complaints</option>
                <option value="Pending">Pending</option>
                <option value="Resolved">Resolved</option>
              </select>

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
                      {isAdminMode && (
                        <>
                          <button style={styles.smallBtn} onClick={() => toggleComplaintStatus(item.id, item.status)}>
                            Toggle
                          </button>
                          <button style={styles.smallBtn} onClick={() => deleteItem('complaints', item.id)}>
                            Delete
                          </button>
                        </>
                      )}
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

function ProfileLine({ label, value }) {
  return (
    <div style={styles.profileLine}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatCard({ title, value, sub, onClick, teamIndex = 0 }) {
  const theme = getIplTheme(teamIndex);

  return (
    <div
      style={{
        ...styles.statCard,
        background: theme.bg,
        color: theme.fg,
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={onClick}
    >
      <span style={styles.teamWatermark}>{theme.name}</span>
      <p style={{ ...styles.statTitle, color: theme.fg }}>{title}</p>
      <h3 style={{ ...styles.statValue, color: theme.fg }}>{value}</h3>
      <span style={{ ...styles.statSub, color: theme.fg }}>{sub}</span>
    </div>
  );
}

const styles: any = {

  introSplash: {
    position: 'fixed',
    inset: 0,
    zIndex: 999999,
    background: '#020617',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  introVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  skipIntroBtn: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    padding: '10px 18px',
    borderRadius: 999,
    border: '1px solid rgba(250,204,21,0.7)',
    background: 'rgba(2,6,23,0.65)',
    color: '#fef3c7',
    fontWeight: 800,
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
  },

  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top left, rgba(250,204,21,0.18), transparent 32%), linear-gradient(135deg, #020617 0%, #111827 45%, #1e1b4b 100%)',
    padding: 20,
    fontFamily: 'Arial, sans-serif',
    color: '#0f172a',
  },
  container: { maxWidth: 1400, margin: '0 auto' },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    background:
      'radial-gradient(circle at 12% 20%, rgba(250,204,21,0.38), transparent 22%), radial-gradient(circle at 88% 18%, rgba(239,68,68,0.28), transparent 25%), linear-gradient(135deg, #020617 0%, #450a0a 42%, #111827 100%)',
    borderRadius: 28,
    padding: 28,
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap',
    marginBottom: 20,
    boxShadow: '0 18px 40px rgba(37,99,235,0.25)',
  },

  heroBrand: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    gap: 26,
    alignItems: 'center',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: 760,
  },
  heroTextBlock: {
    flex: 1,
    minWidth: 260,
  },
  royalFormCard: {
    background:
      'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(68,64,60,0.96))',
    border: '1px solid rgba(250,204,21,0.40)',
    color: '#fef3c7',
    boxShadow: '0 18px 40px rgba(0,0,0,0.25)',
  },
  royalListCard: {
    background:
      'linear-gradient(135deg, rgba(255,251,235,0.98), rgba(255,247,237,0.96))',
    border: '1px solid rgba(217,119,6,0.28)',
    boxShadow: '0 18px 36px rgba(146,64,14,0.15)',
  },
  tenantPremiumRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    marginBottom: 12,
    borderRadius: 20,
    border: '1px solid rgba(217,119,6,0.22)',
    background:
      'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,247,237,0.96))',
    boxShadow: '0 10px 24px rgba(146,64,14,0.10)',
  },

  heroRight: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  dashboardLogo: {
    width: 140,
    height: 140,
    objectFit: 'cover',
    borderRadius: 30,
    border: '3px solid rgba(250,204,21,0.90)',
    boxShadow: '0 18px 40px rgba(0,0,0,0.50), 0 0 28px rgba(250,204,21,0.30)',
    background: '#020617',
  },
  small: { margin: 0, fontSize: 12, letterSpacing: 3, color: '#e0f2fe' },
  smallDark: { margin: 0, fontSize: 12, letterSpacing: 3, color: '#64748b' },
  title: { margin: '10px 0', fontSize: 34 },
  subtitle: { margin: 0, color: '#f8fafc', maxWidth: 650 },
  ogTitle: {
    display: 'inline-block',
    fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
    fontSize: 64,
    letterSpacing: 4,
    color: '#facc15',
    textShadow: '3px 3px 0 #991b1b, 6px 6px 0 rgba(0,0,0,0.55), 0 0 24px rgba(250,204,21,0.35)',
    transform: 'skew(-6deg)',
  },
  titleSmall: {
    display: 'block',
    fontSize: 24,
    color: '#fff7ed',
    letterSpacing: 1,
    marginTop: 8,
  },
  heroWatermark: {
    position: 'absolute',
    right: 20,
    bottom: -22,
    fontFamily: 'Impact, Haettenschweiler, Arial Black, sans-serif',
    fontSize: 110,
    letterSpacing: 6,
    color: 'rgba(255,255,255,0.08)',
    transform: 'skew(-8deg)',
    pointerEvents: 'none',
    zIndex: 1,
  },
  switchBox: {
    minWidth: 240,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: { fontSize: 14, color: '#f8fafc' },
  select: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    border: '1px solid rgba(250,204,21,0.45)',
    fontSize: 14,
    marginBottom: 12,
    boxSizing: 'border-box',
    background: '#ffffff',
    color: '#0f172a',
    WebkitTextFillColor: '#0f172a',
    caretColor: '#0f172a',
  },
  tabs: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    background: 'rgba(255,255,255,0.75)',
    padding: 10,
    borderRadius: 22,
    marginBottom: 20,
    backdropFilter: 'blur(10px)',
  },
  tab: {
    border: 'none',
    background: '#e0e7ff',
    color: '#3730a3',
    padding: '12px 16px',
    borderRadius: 14,
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  activeTab: {
    background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
    color: 'white',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    background: 'rgba(255,255,255,0.9)',
    borderRadius: 22,
    padding: 20,
    boxShadow: '0 12px 28px rgba(15,23,42,0.10)',
    border: '1px solid rgba(255,255,255,0.8)',
  },
  teamWatermark: {
    position: 'absolute',
    right: 10,
    bottom: -2,
    fontSize: 46,
    fontWeight: 900,
    opacity: 0.22,
    letterSpacing: 2,
    pointerEvents: 'none',
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
    borderRadius: 22,
    padding: 20,
    boxShadow: '0 12px 28px rgba(15,23,42,0.10)',
    borderLeft: '6px solid #f97316',
  },
  collectionTitle: { margin: 0, color: '#64748b', fontSize: 14 },
  collectionValue: { margin: '10px 0 6px', fontSize: 28, color: '#2563eb' },
  collectionSub: { color: '#64748b', fontSize: 13 },
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
    background: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: 20,
    boxShadow: '0 12px 28px rgba(15,23,42,0.10)',
  },
  cardTitle: { marginTop: 0, marginBottom: 16, color: '#1e3a8a' },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    border: '1px solid rgba(250,204,21,0.45)',
    fontSize: 14,
    marginBottom: 12,
    boxSizing: 'border-box',
    background: '#ffffff',
    color: '#0f172a',
    WebkitTextFillColor: '#0f172a',
    caretColor: '#0f172a',
  },
  textarea: {
    width: '100%',
    minHeight: 110,
    padding: 12,
    borderRadius: 14,
    border: '1px solid rgba(250,204,21,0.45)',
    fontSize: 14,
    marginBottom: 12,
    resize: 'vertical',
    boxSizing: 'border-box',
    background: '#ffffff',
    color: '#0f172a',
    WebkitTextFillColor: '#0f172a',
    caretColor: '#0f172a',
  },
  primaryBtn: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg,#16a34a,#22c55e)',
    color: 'white',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 8px 18px rgba(22,163,74,0.25)',
  },

  reportBtn: {
    padding: '12px 16px',
    borderRadius: 14,
    border: '1px solid rgba(250,204,21,0.7)',
    background: 'rgba(250,204,21,0.16)',
    color: '#fef3c7',
    fontWeight: 800,
    cursor: 'pointer',
    height: 46,
    backdropFilter: 'blur(10px)',
  },
  insightGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
    gap: 16,
    marginBottom: 20,
  },
  premiumPanel: {
    background: 'linear-gradient(135deg, rgba(2,6,23,0.96), rgba(30,41,59,0.95))',
    border: '1px solid rgba(250,204,21,0.35)',
    borderRadius: 24,
    padding: 20,
    boxShadow: '0 18px 35px rgba(2,6,23,0.20)',
    color: '#f8fafc',
  },
  chartItem: {
    marginBottom: 18,
  },
  chartTop: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 8,
    color: '#fef3c7',
  },
  progressTrack: {
    width: '100%',
    height: 12,
    background: 'rgba(255,255,255,0.13)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg,#22c55e,#38bdf8)',
    borderRadius: 999,
  },
  progressFillGold: {
    height: '100%',
    background: 'linear-gradient(90deg,#f59e0b,#facc15)',
    borderRadius: 999,
  },
  alertRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  alertGood: {
    background: 'rgba(34,197,94,0.16)',
    border: '1px solid rgba(34,197,94,0.35)',
  },
  alertWarn: {
    background: 'rgba(250,204,21,0.16)',
    border: '1px solid rgba(250,204,21,0.35)',
  },
  alertDanger: {
    background: 'rgba(239,68,68,0.18)',
    border: '1px solid rgba(239,68,68,0.35)',
  },
  alertText: {
    margin: '4px 0 0',
    color: '#cbd5e1',
    fontSize: 13,
  },
  alertValue: {
    fontWeight: 900,
    fontSize: 20,
    color: '#facc15',
  },
  miniTitle: {
    margin: '8px 0 12px',
    color: '#92400e',
    fontSize: 16,
  },
  roomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))',
    gap: 10,
    marginBottom: 16,
  },
  viewRoomsBtn: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg,#facc15,#f97316)',
    color: '#422006',
    fontWeight: 900,
    cursor: 'pointer',
    marginBottom: 16,
    boxShadow: '0 10px 22px rgba(249,115,22,0.22)',
  },
  hiddenRoomNotice: {
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    color: '#92400e',
    padding: 14,
    borderRadius: 16,
    textAlign: 'center',
    fontWeight: 600,
    marginBottom: 16,
  },
  roomTile: {
    border: '1px solid #fde68a',
    background: 'linear-gradient(135deg,#fffbeb,#fff7ed)',
    borderRadius: 16,
    padding: 12,
    cursor: 'pointer',
    textAlign: 'left',
    color: '#78350f',
    boxShadow: '0 8px 18px rgba(146,64,14,0.08)',
  },
  bedDots: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 5,
    margin: '10px 0',
  },
  bedDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    display: 'inline-block',
  },
  bedOccupied: {
    background: '#ef4444',
  },
  bedVacant: {
    background: '#22c55e',
  },


  publicRoyalCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 26,
    minHeight: 420,
    border: '1px solid rgba(250,204,21,0.45)',
    boxShadow: '0 22px 55px rgba(0,0,0,0.35)',
    background: '#020617',
  },
  publicRoyalImage: {
    width: '100%',
    height: '100%',
    minHeight: 420,
    objectFit: 'cover',
    display: 'block',
  },
  publicRoyalOverlay: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(2,6,23,0.10), rgba(2,6,23,0.72))',
    color: '#fef3c7',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    textAlign: 'center',
    padding: 24,
    gap: 12,
  },
  adminLoginGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
    gap: 18,
    marginBottom: 20,
  },

  loginTopBtn: {
    padding: '12px 18px',
    borderRadius: 14,
    border: '1px solid rgba(250,204,21,0.75)',
    background: 'linear-gradient(135deg,#facc15,#f97316)',
    color: '#422006',
    fontWeight: 900,
    cursor: 'pointer',
    height: 46,
    boxShadow: '0 10px 22px rgba(249,115,22,0.25)',
  },
  logoutBtn: {
    padding: '12px 16px',
    borderRadius: 14,
    border: 'none',
    background: '#ef4444',
    color: 'white',
    fontWeight: 700,
    cursor: 'pointer',
    height: 46,
  },
  historyBtn: {
    padding: '12px 16px',
    borderRadius: 14,
    border: 'none',
    background: '#facc15',
    color: '#713f12',
    fontWeight: 800,
    cursor: 'pointer',
    height: 46,
  },
  profileBtn: {
    border: 'none',
    background: 'linear-gradient(135deg,#facc15,#f97316)',
    color: '#422006',
    padding: '8px 12px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 800,
  },
  dangerBtn: {
    border: 'none',
    background: '#ef4444',
    color: 'white',
    padding: '8px 12px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 700,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    padding: '14px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  historyRow: {
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  rowSub: { margin: '4px 0 0', fontSize: 13, color: '#64748b' },
  rowActions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  badge: {
    background: '#dbeafe',
    color: '#1e40af',
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
    color: '#2563eb',
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
    backgroundImage:
      'linear-gradient(rgba(2,6,23,0.10), rgba(2,6,23,0.38)), url("/dwaraka-login-bg.png")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: 20,
    fontFamily: 'Arial, sans-serif',
  },
  loginLogo: {
    width: 130,
    height: 130,
    objectFit: 'cover',
    borderRadius: 28,
    display: 'block',
    margin: '0 auto 14px',
    border: '2px solid rgba(250,204,21,0.75)',
    boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
  },
  authCard: {
    width: '100%',
    maxWidth: 420,
    background: 'rgba(2,6,23,0.58)',
    color: '#fef3c7',
    padding: 24,
    borderRadius: 24,
    border: '1px solid rgba(250,204,21,0.45)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
  },
  authTitle: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 28,
    color: '#facc15',
  },
  authSub: {
    marginTop: 0,
    marginBottom: 20,
    color: '#fef3c7',
  },
  errorText: {
    marginTop: 0,
    marginBottom: 12,
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: 600,
  },
};
