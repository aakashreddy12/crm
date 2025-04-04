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
} from '@chakra-ui/react';
import { supabase } from '../lib/supabase';
import { PROJECT_STAGES } from '../lib/constants';
import PaymentReceipt from './PaymentReceipt';
import { createRoot } from 'react-dom/client';
import { useAuth } from '../context/AuthContext';

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
  payment_history: PaymentHistory[];
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
    return isAdmin;
  };

  const handleDownloadReceipt = (amount: number, date: string) => {
    const container = document.createElement('div');
    const root = createRoot(container);
    root.render(
      <PaymentReceipt
        date={new Date(date).toLocaleDateString()}
        amount={amount}
        receivedFrom={project.customer_name}
        paymentMode={project.payment_mode}
        placeOfSupply="Telangana"
      />
    );
    // Clean up after a short delay
    setTimeout(() => {
      root.unmount();
    }, 1000);
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const updateStage = async (direction: 'next' | 'previous') => {
    if (!project) return;

    const currentIndex = PROJECT_STAGES.indexOf(project.current_stage);
    if (currentIndex === -1) return;

    // Don't allow going back before first stage or forward after last stage
    if (
      (direction === 'previous' && currentIndex === 0) ||
      (direction === 'next' && currentIndex === PROJECT_STAGES.length - 1)
    ) return;

    const newStage = direction === 'next' 
      ? PROJECT_STAGES[currentIndex + 1]
      : PROJECT_STAGES[currentIndex - 1];
    
    const isCompleted = newStage === PROJECT_STAGES[PROJECT_STAGES.length - 1];

    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          current_stage: newStage,
          status: isCompleted ? 'completed' : 'active'
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      if (data) {
        setProject(data[0]);
      }
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  const downloadReceipt = (amount: number, date: string) => {
    const receiptProps = {
      date: date,
      amount: amount,
      receivedFrom: project?.customer_name || '',
      paymentMode: project?.payment_mode || 'Bank Transfer',
      placeOfSupply: 'Telangana (36)'
    };

    // Create a temporary container
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Create root and render
    const root = createRoot(container);
    root.render(<PaymentReceipt {...receiptProps} />);

    // Cleanup after PDF is generated
    setTimeout(() => {
      root.unmount();
      document.body.removeChild(container);
    }, 500); // Increased timeout to ensure PDF generation completes
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
                    <Td>{new Date(project.created_at).toLocaleDateString()}</Td>
                    <Td>Advance Payment</Td>
                    <Td isNumeric>â‚¹{project.advance_payment.toLocaleString()}</Td>
                    <Td>{getTimeElapsed(project.created_at)}</Td>
                    <Td>
                      {hasReceiptAccess() && (
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleDownloadReceipt(project.advance_payment, project.created_at)}
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
                    <Td isNumeric>â‚¹{payment.amount.toLocaleString()}</Td>
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
                <Text>â‚¹{project.proposal_amount.toLocaleString()}</Text>
              </HStack>
              <HStack justify="space-between" w="full">
                <Text fontWeight="medium">Advance Payment:</Text>
                <Text color="blue.500">â‚¹{project.advance_payment.toLocaleString()}</Text>
              </HStack>
              <HStack justify="space-between" w="full">
                <Text fontWeight="medium">Total Paid:</Text>
                <Text color="green.500">â‚¹{(project.advance_payment + (project.paid_amount || 0)).toLocaleString()}</Text>
              </HStack>
              <Divider />
              <HStack justify="space-between" w="full">
                <Text fontWeight="bold">Balance Amount:</Text>
                <Text fontWeight="bold" color="red.500">
                  â‚¹{(project.proposal_amount - (project.advance_payment + (project.paid_amount || 0))).toLocaleString()}
                </Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Text fontSize="2xl" fontWeight="bold">Customer Details</Text>
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
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

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
                  onClick={() => updateStage('previous')}
                  disabled={project.current_stage === PROJECT_STAGES[0]}
                  size="sm"
                >
                  â† Previous Stage
                </Button>
                <Button 
                  colorScheme="blue"
                  onClick={() => updateStage('next')}
                  disabled={project.current_stage === PROJECT_STAGES[PROJECT_STAGES.length - 1]}
                  size="sm"
                >
                  Next Stage â†’
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
                />
                <Button
                  colorScheme="green"
                  onClick={handlePayment}
                  isLoading={loading}
                  isDisabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > project.balance_amount}
                >
                  Add Payment
                </Button>
              </HStack>
              <Text fontSize="sm" color="gray.500">
                Maximum payment amount: â‚¹{project.balance_amount.toLocaleString()}
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
