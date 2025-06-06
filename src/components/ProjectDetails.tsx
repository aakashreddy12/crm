import { useParams, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Text,
  Button,
  VStack,
  HStack,
  Progress,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  FormControl,
  FormLabel,
  useDisclosure,
  Card,
  CardHeader,
  CardBody,
  Divider,
  SimpleGrid,
  useToast,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  ModalCloseButton,
  Tooltip,
  IconButton,
  Select,
} from '@chakra-ui/react';
import { supabase } from '../lib/supabase';
import { PROJECT_STAGES } from '../lib/constants';
import PaymentReceipt from './PaymentReceipt';
import { createRoot } from 'react-dom/client';
import { useAuth } from '../context/AuthContext';
import { EditIcon } from '@chakra-ui/icons';

interface PaymentHistory {
  id: string;
  amount: number;
  created_at: string;
  payment_mode?: string;
  payment_date?: string;
}

interface Project {
  id: string;
  name: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  proposal_amount: number;
  advance_payment: number;
  balance_amount: number;
  paid_amount: number;
  loan_amount: number;
  status: string;
  current_stage: string;
  project_type: 'DCR' | 'Non DCR';
  payment_mode: 'Loan' | 'Cash';
  created_at: string;
  start_date: string;
  payment_history: PaymentHistory[];
  kwh: number;
}

const getTimeElapsed = (timestamp: string, isAdvancePayment: boolean = false) => {
  if (!timestamp) return 'N/A';
  
  const now = new Date();
  const paymentDate = new Date(timestamp);
  
  // Check if the date is valid
  if (isNaN(paymentDate.getTime())) return 'Invalid date';
  
  // Handle timezone offset correctly
  const utcPaymentDate = new Date(paymentDate.getTime() + paymentDate.getTimezoneOffset() * 60000);
  const diffInMillis = now.getTime() - utcPaymentDate.getTime();
  
  const days = Math.floor(diffInMillis / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffInMillis % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffInMillis % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ago`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ago`;
  }
  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return 'Just now';
};

const ProjectDetails = () => {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => {
    const savedDate = sessionStorage.getItem(`payment_date_${id}`);
    return savedDate || new Date().toISOString().split('T')[0];
  });
  const [paymentMode, setPaymentMode] = useState(() => {
    const savedMode = sessionStorage.getItem(`payment_mode_${id}`);
    return savedMode || 'Cash';
  });
  const { isAdmin, isAuthenticated, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Add separate loading state for different operations
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [stageLoading, setStageLoading] = useState(false);

  // Customer edit modal state
  const { 
    isOpen: isEditOpen, 
    onOpen: onEditOpen, 
    onClose: onEditClose 
  } = useDisclosure();
  const [customerFormData, setCustomerFormData] = useState({
    customer_name: '',
    email: '',
    phone: '',
    address: '',
    kwh: 0,
    loan_amount: 0,
    start_date: ''
  });

  // Start date edit modal state
  const { 
    isOpen: isStartDateModalOpen, 
    onOpen: onStartDateModalOpen, 
    onClose: onStartDateModalClose 
  } = useDisclosure();

  // Add useEffect for timestamp updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Force a re-render to update timestamps
      setProject(prev => ({ ...prev! }));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const fetchProjectAndPayments = useCallback(async () => {
    if (!id || !isAuthenticated) return;

    try {
      // Fetch project details with payment history
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          payment_history (
            id,
            amount,
            created_at,
            payment_mode,
            payment_date
          )
        `)
        .eq('id', id)
        .single();

      if (projectError) throw projectError;

      setProject(projectData);
    } catch (error: any) {
      console.error('Error fetching project:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch project details',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated, toast]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchProjectAndPayments();
  }, [fetchProjectAndPayments, isAuthenticated, navigate]);

  // Initialize customer form data when project is loaded (only once)
  useEffect(() => {
    if (project && !isEditOpen) {
      setCustomerFormData({
        customer_name: project.customer_name || '',
        email: project.email || '',
        phone: project.phone || '',
        address: project.address || '',
        kwh: project.kwh || 0,
        loan_amount: project.loan_amount || 0,
        start_date: project.start_date || ''
      });
    }
  }, [project, isEditOpen]);

  // Reset form data when opening the modal
  const handleEditOpen = () => {
    if (project) {
      setCustomerFormData({
        customer_name: project.customer_name || '',
        email: project.email || '',
        phone: project.phone || '',
        address: project.address || '',
        kwh: project.kwh || 0,
        loan_amount: project.loan_amount || 0,
        start_date: project.start_date || ''
      });
    }
    onEditOpen();
  };

  // Handle form input changes
  const handleCustomerFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerFormData(prev => ({
      ...prev,
      [name]: (name === 'kwh' || name === 'loan_amount') ? (value === '' ? 0 : parseFloat(value) || 0) : value
    }));
  };

  // Add handler to update session storage when values change
  const handlePaymentDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setPaymentDate(newDate);
    sessionStorage.setItem(`payment_date_${id}`, newDate);
  };
  
  const handlePaymentModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value;
    setPaymentMode(newMode);
    sessionStorage.setItem(`payment_mode_${id}`, newMode);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="calc(100vh - 64px)"
      >
        <VStack spacing={4}>
          <Text fontSize="lg">Loading project details...</Text>
          <Progress size="xs" isIndeterminate w="200px" />
        </VStack>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="calc(100vh - 64px)"
      >
        <Text fontSize="lg">Project not found</Text>
      </Box>
    );
  }

  const updatePayment = async (amount: number) => {
    if (!project) return;

    try {
      const newPaidAmount = project.advance_payment + (project.paid_amount || 0) + amount;

      if (newPaidAmount > project.proposal_amount) {
        toast({
          title: 'Error',
          description: 'Payment amount cannot exceed the total amount',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_history')
        .insert({
          project_id: id,
          amount: amount,
          created_at: new Date().toISOString()
        })
        .select();

      if (paymentError) throw paymentError;

      const { data, error } = await supabase
        .from('projects')
        .update({
          paid_amount: newPaidAmount - project.advance_payment,
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      
      const { data: updatedProject, error: fetchError } = await supabase
        .from('projects')
        .select(`
          *,
          payment_history (
            amount,
            created_at
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (updatedProject) {
        setProject(updatedProject);
      }

      toast({
        title: 'Payment Updated',
        description: 'Payment has been recorded successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const hasReceiptAccess = () => {
    // Allow admin users, contact@axisogreen.in, and dhanush@axisogreen.in to download receipts
    return isAdmin || (user?.email === 'contact@axisogreen.in') || (user?.email === 'dhanush@axisogreen.in');
  };

  const handleDownloadReceipt = (amount: number, date: string, mode: string = 'Cash', isAdvance: boolean = false) => {
    const container = document.createElement('div');
    const root = createRoot(container);
    
    // Format date as DD-MM-YYYY
    const dateObj = new Date(date);
    const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getFullYear()}`;
    
    root.render(
      <PaymentReceipt
        date={formattedDate}
        amount={amount}
        receivedFrom={project.customer_name}
        paymentMode={isAdvance ? 'Cash/UPI' : (mode || project.payment_mode || 'Cash')}
        placeOfSupply="Telangana"
        customerAddress={project.address}
      />
    );
    // Clean up after a short delay
    setTimeout(() => {
      root.unmount();
    }, 1000);
  };

  const handlePayment = async () => {
    try {
      setPaymentLoading(true);
      const amount = parseFloat(paymentAmount);
      
      if (amount <= 0) {
        toast({
          title: 'Invalid Amount',
          description: 'Payment amount must be greater than 0',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setPaymentLoading(false);
        return;
      }

      const actualBalanceAmount = project.proposal_amount - (project.advance_payment + (project.paid_amount || 0));
      if (amount > actualBalanceAmount) {
        toast({
          title: 'Invalid Amount',
          description: 'Payment amount cannot exceed the remaining balance',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setPaymentLoading(false);
        return;
      }

      // Create the payment with complete information
      const { data: paymentData, error } = await supabase
        .from('payment_history')
        .insert([{ 
          project_id: project.id, 
          amount,
          payment_mode: paymentMode,
          payment_date: paymentDate
        }])
        .select();

      if (error) throw error;

      // Update the project in Supabase with new paid_amount
      const newPaidAmount = (project.paid_amount || 0) + amount;
      const { error: updateError } = await supabase
        .from('projects')
        .update({ 
          paid_amount: newPaidAmount 
        })
        .eq('id', project.id);
      if (updateError) throw updateError;

      // Force a fresh data fetch to ensure UI consistency
      await fetchProjectAndPayments();

      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setPaymentAmount('');
      // Don't reset payment date and mode here, preserving for user convenience
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to record payment',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  // Main component return
  // Helper: Can the user delete payments?
const hasDeleteAccess = () => {
  return user?.email === 'admin@axisogreen.in';
};

// Helper: Delete payment
const handleDeletePayment = async (paymentId: string) => {
  if (!window.confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
    return;
  }
  try {
    setLoading(true);
    // First, get the payment details to calculate the amount to subtract
    const { data: paymentData, error: fetchError } = await supabase
      .from('payment_history')
      .select('amount')
      .eq('id', paymentId)
      .single();
    if (fetchError) throw fetchError;
    const amountToRemove = paymentData?.amount || 0;
    // Delete the payment
    const { error: deleteError } = await supabase
      .from('payment_history')
      .delete()
      .match({ id: paymentId });
    if (deleteError) throw deleteError;
    // Update the project's paid_amount
    const newPaidAmount = Math.max(0, (project?.paid_amount || 0) - amountToRemove);
    const { error: updateError } = await supabase
      .from('projects')
      .update({ paid_amount: newPaidAmount })
      .eq('id', project?.id);
    if (updateError) throw updateError;
    await fetchProjectAndPayments();
    toast({
      title: 'Payment Deleted',
      description: 'The payment has been deleted successfully',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    toast({
      title: 'Error',
      description: 'Failed to delete payment',
      status: 'error',
      duration: 3000,
      isClosable: true,
    });
  } finally {
    setLoading(false);
  }
};

// Render payment history
const renderPaymentHistory = () => {
  if (!project) return null;
  return (
    <Card mt={8}>
      <CardHeader>
        <Text fontSize="2xl" fontWeight="bold">Payment History</Text>
      </CardHeader>
      <CardBody>
        <TableContainer>
          <Table variant="simple" size="md">
            <Thead>
              <Tr>
                <Th>Date</Th>
                <Th>Payment Type</Th>
                <Th isNumeric>Amount</Th>
                <Th>Time Elapsed</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {project.advance_payment > 0 && (
                <Tr>
                  <Td>
                    {project.start_date
                      ? new Date(project.start_date).toLocaleDateString()
                      : project.created_at
                        ? new Date(project.created_at).toLocaleDateString()
                        : 'N/A'}
                  </Td>
                  <Td>Advance Payment</Td>
                  <Td isNumeric>₹{project.advance_payment.toLocaleString()}</Td>
                  <Td>
                    {project.start_date
                      ? getTimeElapsed(project.start_date, true)
                      : project.created_at
                        ? getTimeElapsed(project.created_at, true)
                        : 'N/A'}
                  </Td>
                  <Td>
                    {hasReceiptAccess() && (
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => handleDownloadReceipt(
                          project.advance_payment,
                          project.start_date || project.created_at,
                          'Cash/UPI',
                          true
                        )}
                        isDisabled={loading}
                      >
                        Download Receipt
                      </Button>
                    )}
                  </Td>
                </Tr>
              )}
              {project.payment_history?.map((payment: any) => (
                <Tr key={payment.id}>
                  <Td>
                    {payment.payment_date
                      ? new Date(payment.payment_date).toLocaleDateString()
                      : payment.created_at
                        ? new Date(payment.created_at).toLocaleDateString()
                        : 'N/A'}
                  </Td>
                  <Td>{payment.payment_mode || 'Cash'}</Td>
                  <Td isNumeric>₹{payment.amount.toLocaleString()}</Td>
                  <Td>{payment.payment_date ? getTimeElapsed(payment.payment_date) : payment.created_at ? getTimeElapsed(payment.created_at) : 'N/A'}</Td>
                  <Td>
                    <HStack spacing={2}>
                      {hasReceiptAccess() && (
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleDownloadReceipt(
                            payment.amount,
                            payment.payment_date || payment.created_at,
                            payment.payment_mode || 'Cash',
                            false
                          )}
                          isDisabled={loading}
                        >
                          Download Receipt
                        </Button>
                      )}
                      {hasDeleteAccess() && (
                        <Button
                          size="sm"
                          colorScheme="red"
                          onClick={() => handleDeletePayment(payment.id)}
                          isDisabled={loading}
                        >
                          Delete
                        </Button>
                      )}
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </CardBody>
    </Card>
  );
};

return (
    <Box p={6} maxW="1200px" mx="auto">
      {/* Add Payment Card/Modal */}
      <Card mt={8}>
        <CardHeader>
          <Text fontSize="2xl" fontWeight="bold">Add Payment</Text>
        </CardHeader>
        <CardBody>
          <VStack align="start" spacing={4}>
            <FormControl isRequired>
              <FormLabel>Payment Amount</FormLabel>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter payment amount"
                max={project.proposal_amount - (project.advance_payment + (project.paid_amount || 0))}
                min={0}
                step="0.01"
                isDisabled={paymentLoading}
              />
              <Text fontSize="sm" color="gray.500">
                Maximum payment amount: ₹{(project.proposal_amount - (project.advance_payment + (project.paid_amount || 0))).toLocaleString()}
              </Text>
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Payment Date</FormLabel>
              <Input
                type="date"
                value={paymentDate}
                onChange={handlePaymentDateChange}
                isDisabled={paymentLoading}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Payment Mode</FormLabel>
              <Select
                value={paymentMode}
                onChange={handlePaymentModeChange}
                isDisabled={paymentLoading}
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Subsidy">Subsidy</option>
              </Select>
            </FormControl>
            <Button
              colorScheme="green"
              width="full"
              onClick={handlePayment}
              isLoading={paymentLoading}
              loadingText="Adding"
              isDisabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > (project.proposal_amount - (project.advance_payment + (project.paid_amount || 0))) || paymentLoading}
            >
              Add Payment
            </Button>
          </VStack>
        </CardBody>
      </Card>

      {/* Payment History Section */}
      {renderPaymentHistory()}
    </Box>
  );
}
export default ProjectDetails;
