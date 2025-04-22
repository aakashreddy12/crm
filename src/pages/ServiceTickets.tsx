import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Heading,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Flex,
  Spacer,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useToast,
  Select,
  VStack,
  Spinner,
  Center,
  HStack,
  Text,
  IconButton,
  Tooltip
} from '@chakra-ui/react';
import { AddIcon, CheckIcon, ViewIcon } from '@chakra-ui/icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Define interface for Service Ticket
interface ServiceTicket {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// Define interface for Customer
interface Customer {
  customer_name: string;
  email: string;
  phone: string;
  address: string;
}

const ServiceTickets = () => {
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    email: '',
    phone: '',
    address: '',
    description: ''
  });
  const [viewTicket, setViewTicket] = useState<ServiceTicket | null>(null);
  const { isOpen: isNewOpen, onOpen: onNewOpen, onClose: onNewClose } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  // Fetch all service tickets
  const fetchServiceTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('service_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error: any) {
      console.error('Error fetching service tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch service tickets',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch customers for dropdown
  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('customer_name, email, phone, address')
        .eq('status', 'active');

      if (error) throw error;
      
      // Remove duplicates by customer name
      const uniqueCustomers: { [key: string]: Customer } = {};
      data?.forEach(customer => {
        if (!uniqueCustomers[customer.customer_name]) {
          uniqueCustomers[customer.customer_name] = customer;
        }
      });
      
      setCustomers(Object.values(uniqueCustomers));
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch customers',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [toast]);

  // Load data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchServiceTickets();
      fetchCustomers();
    }
  }, [isAuthenticated, fetchServiceTickets, fetchCustomers]);

  // Handle customer selection change
  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerName = e.target.value;
    const selected = customers.find(customer => customer.customer_name === customerName) || null;
    
    setSelectedCustomer(selected);
    
    if (selected) {
      setFormData({
        ...formData,
        customer_name: selected.customer_name,
        email: selected.email || '',
        phone: selected.phone || '',
        address: selected.address || ''
      });
    } else {
      setFormData({
        ...formData,
        customer_name: '',
        email: '',
        phone: '',
        address: ''
      });
    }
  };

  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle form submission for creating new ticket
  const handleSubmit = async () => {
    if (!formData.customer_name || !formData.description) {
      toast({
        title: 'Missing fields',
        description: 'Please select a customer and provide a description',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('service_tickets')
        .insert([
          {
            customer_name: formData.customer_name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            description: formData.description,
            status: 'open'
          }
        ])
        .select();

      if (error) throw error;

      setTickets(prev => [data[0], ...prev]);
      
      toast({
        title: 'Success',
        description: 'Service ticket created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Reset form and close modal
      setFormData({
        customer_name: '',
        email: '',
        phone: '',
        address: '',
        description: ''
      });
      setSelectedCustomer(null);
      onNewClose();
      
      // Refresh tickets list
      fetchServiceTickets();
    } catch (error: any) {
      console.error('Error creating service ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to create service ticket',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle marking a ticket as complete
  const handleMarkComplete = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('service_tickets')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId)
        .select();

      if (error) throw error;

      // Update ticket in state
      setTickets(prev => 
        prev.map(ticket => 
          ticket.id === ticketId ? { ...data[0] } : ticket
        )
      );
      
      toast({
        title: 'Success',
        description: 'Service ticket marked as completed',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error('Error updating service ticket:', error);
      toast({
        title: 'Error',
        description: 'Failed to update service ticket',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // View ticket details
  const handleViewTicket = (ticket: ServiceTicket) => {
    setViewTicket(ticket);
    onViewOpen();
  };

  // Function to get badge color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'red';
      case 'in_progress':
        return 'orange';
      case 'completed':
        return 'green';
      default:
        return 'gray';
    }
  };

  // Format date function to replace date-fns dependency
  const formatDate = (dateString: string, format = 'short') => {
    const date = new Date(dateString);
    
    if (format === 'short') {
      return date.toLocaleDateString(); // Format: MM/DD/YYYY
    }
    
    return date.toLocaleString(); // Format: MM/DD/YYYY, HH:MM:SS AM/PM
  };

  return (
    <Box p={6} maxW="1200px" mx="auto">
      <Card mb={6}>
        <CardHeader>
          <Flex align="center">
            <Heading size="lg">Service Tickets</Heading>
            <Spacer />
            <Button 
              leftIcon={<AddIcon />} 
              colorScheme="green" 
              onClick={onNewOpen}
            >
              New Ticket
            </Button>
          </Flex>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <Center py={10}>
              <Spinner size="xl" color="green.500" />
            </Center>
          ) : tickets.length === 0 ? (
            <Center py={10}>
              <Text>No service tickets found. Create a new one to get started.</Text>
            </Center>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Ticket ID</Th>
                  <Th>Customer</Th>
                  <Th>Date Created</Th>
                  <Th>Status</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {tickets.map((ticket) => (
                  <Tr key={ticket.id}>
                    <Td>{ticket.id.substring(0, 8)}...</Td>
                    <Td>{ticket.customer_name}</Td>
                    <Td>{formatDate(ticket.created_at)}</Td>
                    <Td>
                      <Badge colorScheme={getStatusColor(ticket.status)}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        <Tooltip label="View Details">
                          <IconButton
                            aria-label="View ticket"
                            icon={<ViewIcon />}
                            size="sm"
                            colorScheme="blue"
                            onClick={() => handleViewTicket(ticket)}
                          />
                        </Tooltip>
                        {ticket.status !== 'completed' && (
                          <Tooltip label="Mark as Complete">
                            <IconButton
                              aria-label="Mark as complete"
                              icon={<CheckIcon />}
                              size="sm"
                              colorScheme="green"
                              onClick={() => handleMarkComplete(ticket.id)}
                            />
                          </Tooltip>
                        )}
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Create New Ticket Modal */}
      <Modal isOpen={isNewOpen} onClose={onNewClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Service Ticket</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Customer</FormLabel>
                <Select
                  placeholder="Select customer"
                  value={formData.customer_name}
                  onChange={handleCustomerChange}
                >
                  {customers.map((customer) => (
                    <option key={customer.customer_name} value={customer.customer_name}>
                      {customer.customer_name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              {selectedCustomer && (
                <>
                  <FormControl>
                    <FormLabel>Email</FormLabel>
                    <Input
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      isReadOnly
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Phone</FormLabel>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      isReadOnly
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Address</FormLabel>
                    <Input
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      isReadOnly
                    />
                  </FormControl>
                </>
              )}
              
              <FormControl isRequired>
                <FormLabel>Description</FormLabel>
                <Textarea
                  name="description"
                  placeholder="Describe the issue..."
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onNewClose}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={handleSubmit}>
              Create Ticket
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View Ticket Details Modal */}
      <Modal isOpen={isViewOpen} onClose={onViewClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Ticket Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {viewTicket && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold">Status:</Text>
                  <Badge colorScheme={getStatusColor(viewTicket.status)} mt={1}>
                    {viewTicket.status.replace('_', ' ')}
                  </Badge>
                </Box>
                
                <Box>
                  <Text fontWeight="bold">Customer:</Text>
                  <Text>{viewTicket.customer_name}</Text>
                </Box>
                
                <Box>
                  <Text fontWeight="bold">Contact:</Text>
                  <Text>{viewTicket.email}</Text>
                  <Text>{viewTicket.phone}</Text>
                </Box>
                
                <Box>
                  <Text fontWeight="bold">Address:</Text>
                  <Text>{viewTicket.address}</Text>
                </Box>
                
                <Box>
                  <Text fontWeight="bold">Description:</Text>
                  <Text>{viewTicket.description}</Text>
                </Box>
                
                <Box>
                  <Text fontWeight="bold">Created:</Text>
                  <Text>{formatDate(viewTicket.created_at, 'long')}</Text>
                </Box>
                
                {viewTicket.completed_at && (
                  <Box>
                    <Text fontWeight="bold">Completed:</Text>
                    <Text>{formatDate(viewTicket.completed_at, 'long')}</Text>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={onViewClose}>
              Close
            </Button>
            {viewTicket && viewTicket.status !== 'completed' && (
              <Button
                colorScheme="green"
                ml={3}
                onClick={() => {
                  handleMarkComplete(viewTicket.id);
                  onViewClose();
                }}
              >
                Mark as Complete
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ServiceTickets; 