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
  status: string;
  current_stage: string;
  project_type: 'DCR' | 'Non DCR';
  payment_mode: 'Loan' | 'Cash';
  created_at: string;
  start_date: string;
  payment_history: PaymentHistory[];
  kwh: number;
}

const getTimeElapsed = (timestamp: string) => {
  const now = new Date();
  const paymentDate = new Date(timestamp);
  const diffInMillis = now.getTime() - paymentDate.getTime();
  
  const days = Math.floor(diffInMillis / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffInMillis % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffInMillis % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ago`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ago`;
  }
  return `${minutes}m ago`;
};

const ProjectDetails = () => {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [paymentAmount, setPaymentAmount] = useState('');
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
    kwh: 0
  });

  // Add useEffect for timestamp updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Force a re-render to update timestamps
      setProject(prev => ({ ...prev! }));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const fetchProjectAndPayments = async () => {
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
            created_at
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
  };

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
        kwh: project.kwh || 0
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
        kwh: project.kwh || 0
      });
    }
    onEditOpen();
  };

  // Handle form input changes
  const handleCustomerFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerFormData(prev => ({
      ...prev,
      [name]: name === 'kwh' ? (value === '' ? 0 : parseFloat(value) || 0) : value
    }));
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
      const newBalanceAmount = project.proposal_amount - newPaidAmount;

      if (newBalanceAmount < 0) {
        toast({
          title: 'Error',
          description: 'Payment amount cannot exceed the remaining balance',
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
          balance_amount: newBalanceAmount
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
    // Allow both admin users and contact@axisogreen.in to download receipts
    return isAdmin || (user?.email === 'contact@axisogreen.in');
  };

  const handleDownloadReceipt = (amount: number, date: string) => {
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
        paymentMode={project.payment_mode || 'Bank Transfer'}
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
        return;
      }

      if (amount > project.balance_amount) {
        toast({
          title: 'Invalid Amount',
          description: 'Payment amount cannot exceed the remaining balance',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      const { data: paymentData, error } = await supabase
        .from('payment_history')
        .insert([{ project_id: project.id, amount }])
        .select();

      if (error) throw error;

      // Update the project's payment history in state
      if (paymentData && project) {
        setProject({
          ...project,
          payment_history: [...(project.payment_history || []), paymentData[0]],
          paid_amount: (project.paid_amount || 0) + amount,
          balance_amount: project.balance_amount - amount
        });
      }

      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setPaymentAmount('');
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

  const handleStageChange = async (newStage: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ stage: newStage })
        .eq('id', project.id);

      if (error) throw error;

      setProject((prevProject) => {
        if (!prevProject) return null;
        return { ...prevProject, stage: newStage };
      });
      toast({
        title: 'Success',
        description: 'Project stage updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error updating project stage:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project stage',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Advance Payment Done':
        return 'bg-green-100 text-green-800';
      case 'Advance Payment -- Approvals / First Payment':
        return 'bg-yellow-100 text-yellow-800';
      case 'Approvals -- Loan Applications':
        return 'bg-blue-100 text-blue-800';
      case 'Loan Started -- Loan Process':
        return 'bg-indigo-100 text-indigo-800';
      case 'Loan Approved / First Payment Collected -- Material Order':
        return 'bg-purple-100 text-purple-800';
      case 'Materials Ordered -- Materials Deliver':
        return 'bg-pink-100 text-pink-800';
      case 'Materials Delivered -- Installation':
        return 'bg-red-100 text-red-800';
      case 'Installation Done / Second Payment Done -- Net meter Application':
        return 'bg-orange-100 text-orange-800';
      case 'Net Meter Application -- Net Meter Installation':
        return 'bg-amber-100 text-amber-800';
      case 'Net Meter Installed -- Inspection / Final Payment':
        return 'bg-lime-100 text-lime-800';
      case 'Approved Inspection -- Subsidy in Progress':
        return 'bg-emerald-100 text-emerald-800';
      case 'Subsidy Disbursed -- Final payment':
        return 'bg-teal-100 text-teal-800';
      case 'Final Payment Done':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderPaymentHistory = () => {
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
                    <Td>{project.start_date ? new Date(project.start_date).toLocaleDateString() : new Date(project.created_at).toLocaleDateString()}</Td>
                    <Td>Advance Payment</Td>
                    <Td isNumeric>₹{project.advance_payment.toLocaleString()}</Td>
                    <Td>{project.start_date ? getTimeElapsed(project.start_date) : getTimeElapsed(project.created_at)}</Td>
                    <Td>
                      {hasReceiptAccess() && (
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleDownloadReceipt(project.advance_payment, project.start_date || project.created_at)}
                          isDisabled={loading}
                        >
                          Download Receipt
                        </Button>
                      )}
                    </Td>
                  </Tr>
                )}
                {project.payment_history?.map((payment) => (
                  <Tr key={payment.id}>
                    <Td>{new Date(payment.created_at).toLocaleDateString()}</Td>
                    <Td>Regular Payment</Td>
                    <Td isNumeric>₹{payment.amount.toLocaleString()}</Td>
                    <Td>{getTimeElapsed(payment.created_at)}</Td>
                    <Td>
                      {hasReceiptAccess() && (
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleDownloadReceipt(payment.amount, payment.created_at)}
                          isDisabled={loading}
                        >
                          Download Receipt
                        </Button>
                      )}
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

  const currentStageIndex = PROJECT_STAGES.indexOf(project.current_stage);
  const progress = ((currentStageIndex + 1) / PROJECT_STAGES.length) * 100;

  // Add function to check if user can add payments
  const canAddPayment = () => {
    return isAdmin && user?.email !== 'contact@axisogreen.in';
  };

  // Handle customer details update
  const handleCustomerUpdate = async () => {
    if (!project || !id) return;

    setEditLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          customer_name: customerFormData.customer_name,
          email: customerFormData.email,
          phone: customerFormData.phone,
          address: customerFormData.address,
          kwh: customerFormData.kwh
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      
      // Update project data
      if (data && data[0]) {
        setProject({
          ...project,
          customer_name: customerFormData.customer_name,
          email: customerFormData.email,
          phone: customerFormData.phone,
          address: customerFormData.address,
          kwh: customerFormData.kwh
        });
      }

      toast({
        title: 'Customer Updated',
        description: 'Customer details have been updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onEditClose();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to update customer details',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setEditLoading(false);
    }
  };

  // Check if user has edit access
  const hasEditAccess = () => {
    return isAdmin || user?.email === 'contact@axisogreen.in';
  };

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
        <Card>
          <CardHeader>
            <Text fontSize="2xl" fontWeight="bold">{project.name}</Text>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={4}>
              <HStack justify="space-between" w="full">
                <Text fontWeight="medium">Total Amount:</Text>
                <Text>₹{project.proposal_amount.toLocaleString()}</Text>
              </HStack>
              <HStack justify="space-between" w="full">
                <Text fontWeight="medium">Advance Payment:</Text>
                <Text color="blue.500">₹{project.advance_payment.toLocaleString()}</Text>
              </HStack>
              <HStack justify="space-between" w="full">
                <Text fontWeight="medium">Total Paid:</Text>
                <Text color="green.500">₹{(project.advance_payment + (project.paid_amount || 0)).toLocaleString()}</Text>
              </HStack>
              <Divider />
              <HStack justify="space-between" w="full">
                <Text fontWeight="bold">Balance Amount:</Text>
                <Text fontWeight="bold" color="red.500">
                  ₹{(project.proposal_amount - (project.advance_payment + (project.paid_amount || 0))).toLocaleString()}
                </Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <Text fontSize="2xl" fontWeight="bold">Customer Details</Text>
              {hasEditAccess() && (
                <Tooltip label="Edit Customer Details">
                  <IconButton
                    aria-label="Edit customer details"
                    icon={<EditIcon />}
                    size="sm"
                    colorScheme="blue"
                    onClick={handleEditOpen}
                  />
                </Tooltip>
              )}
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={4} width="full">
              <HStack justify="space-between" w="full">
                <Text fontWeight="medium">Customer Name:</Text>
                <Text>{project.customer_name}</Text>
              </HStack>
              <Divider />
              <HStack justify="space-between" w="full">
                <Text fontWeight="medium">Phone Number:</Text>
                <Text>{project.phone}</Text>
              </HStack>
              <Divider />
              <HStack justify="space-between" w="full">
                <Text fontWeight="medium">Email:</Text>
                <Text>{project.email}</Text>
              </HStack>
              <Divider />
              <HStack justify="space-between" w="full">
                <Text fontWeight="medium">Address:</Text>
                <Text>{project.address}</Text>
              </HStack>
              <Divider />
              <HStack justify="space-between" w="full">
                <Text fontWeight="medium">KWH:</Text>
                <Text>{project.kwh || 'N/A'}</Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Customer Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Customer Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Customer Name</FormLabel>
                <Input 
                  name="customer_name"
                  value={customerFormData.customer_name}
                  onChange={handleCustomerFormChange}
                  isDisabled={editLoading}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input 
                  name="email"
                  type="email"
                  value={customerFormData.email}
                  onChange={handleCustomerFormChange}
                  isDisabled={editLoading}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Phone</FormLabel>
                <Input 
                  name="phone"
                  value={customerFormData.phone}
                  onChange={handleCustomerFormChange}
                  isDisabled={editLoading}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Address</FormLabel>
                <Input 
                  name="address"
                  value={customerFormData.address}
                  onChange={handleCustomerFormChange}
                  isDisabled={editLoading}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>KWH</FormLabel>
                <Input 
                  name="kwh"
                  type="number"
                  value={customerFormData.kwh}
                  onChange={handleCustomerFormChange}
                  isDisabled={editLoading}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose} isDisabled={editLoading}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleCustomerUpdate} 
              isLoading={editLoading}
              loadingText="Saving"
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Card mt={8}>
        <CardHeader>
          <Text fontSize="2xl" fontWeight="bold">Project Progress</Text>
        </CardHeader>
        <CardBody>
          <VStack align="start" spacing={4} width="full">
            <HStack justify="space-between" width="full">
              <Text>Status: <Badge colorScheme={project.status === 'completed' ? 'green' : 'blue'}>{project.status}</Badge></Text>
              <HStack spacing={2}>
                <Button 
                  colorScheme="yellow"
                  onClick={() => handleStageChange(PROJECT_STAGES[Math.max(0, currentStageIndex - 1)])}
                  disabled={project.current_stage === PROJECT_STAGES[0]}
                  isLoading={stageLoading}
                  size="sm"
                >
                  ← Previous Stage
                </Button>
                <Button 
                  colorScheme="blue"
                  onClick={() => handleStageChange(PROJECT_STAGES[Math.min(PROJECT_STAGES.length - 1, currentStageIndex + 1)])}
                  disabled={project.current_stage === PROJECT_STAGES[PROJECT_STAGES.length - 1]}
                  isLoading={stageLoading}
                  size="sm"
                >
                  Next Stage →
                </Button>
              </HStack>
            </HStack>
            <Text>Current Stage: {project.current_stage}</Text>
            <Progress 
              value={progress}
              size="lg"
              colorScheme="blue"
              width="full"
              borderRadius="full"
            />
          </VStack>
        </CardBody>
      </Card>

      {canAddPayment() && (
        <Card mt={8}>
          <CardHeader>
            <Text fontSize="2xl" fontWeight="bold">Add Payment</Text>
          </CardHeader>
          <CardBody>
            <VStack align="start" spacing={4}>
              <HStack width="full">
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter payment amount"
                  max={project.balance_amount}
                  min={0}
                  step="0.01"
                  isDisabled={paymentLoading}
                />
                <Button
                  colorScheme="green"
                  onClick={handlePayment}
                  isLoading={paymentLoading}
                  loadingText="Adding"
                  isDisabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > project.balance_amount || paymentLoading}
                >
                  Add Payment
                </Button>
              </HStack>
              <Text fontSize="sm" color="gray.500">
                Maximum payment amount: ₹{project.balance_amount.toLocaleString()}
              </Text>
            </VStack>
          </CardBody>
        </Card>
      )}

      {renderPaymentHistory()}
    </Box>
  );
};

export default ProjectDetails; 