import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  CloseButton,
  FormControl,
  FormLabel,
  Input,
  VStack,
  TableContainer,
  Select,
  Badge,
  useToast,
  HStack,
  Text,
  Tooltip
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Project {
  id: string;
  name: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  project_type: 'DCR' | 'Non DCR';
  payment_mode: 'Loan' | 'Cash';
  proposal_amount: number;
  advance_payment: number;
  balance_amount: number;
  status: string;
  current_stage: string;
  start_date: string;
}

// Utility function to calculate elapsed time since start date
const calculateElapsedTime = (startDateStr: string | null) => {
  if (!startDateStr) return 'N/A';
  
  const startDate = new Date(startDateStr);
  const currentDate = new Date();
  
  // Check for invalid date
  if (isNaN(startDate.getTime())) return 'N/A';
  
  const diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 1) return 'Today';
  if (diffDays === 1) return '1 day';
  if (diffDays < 7) return `${diffDays} days`;
  
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return '1 week';
  if (diffWeeks < 4) return `${diffWeeks} weeks`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month';
  if (diffMonths < 12) return `${diffMonths} months`;
  
  const diffYears = Math.floor(diffDays / 365);
  if (diffYears === 1) return '1 year';
  return `${diffYears} years`;
};

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigate = useNavigate();
  const [newProject, setNewProject] = useState({
    name: '',
    customer_name: '',
    email: '',
    phone: '',
    address: '',
    project_type: 'DCR',
    payment_mode: 'Cash',
    proposal_amount: '',
    advance_payment: '',
    start_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const toast = useToast();

  useEffect(() => {
    fetchProjects();
  }, [filter]);

  const fetchProjects = async () => {
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .neq('status', 'deleted');

      if (filter === 'active') {
        query = query.eq('status', 'active');
      } else if (filter === 'completed') {
        query = query.eq('status', 'completed');
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase error:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch projects. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      if (data) {
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProject(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      const startDate = newProject.start_date 
        ? new Date(newProject.start_date).toISOString() 
        : new Date().toISOString();
        
      const projectData = {
        name: newProject.name,
        customer_name: newProject.customer_name,
        email: newProject.email,
        phone: newProject.phone,
        address: newProject.address,
        project_type: newProject.project_type,
        payment_mode: newProject.payment_mode,
        proposal_amount: parseFloat(newProject.proposal_amount),
        advance_payment: parseFloat(newProject.advance_payment),
        status: 'active',
        current_stage: 'Advance payment done',
        start_date: startDate,
      };

      const { error } = await supabase
        .from('projects')
        .insert([projectData]);

      if (error) {
        console.error('Supabase error:', error);
        toast({
          title: 'Error',
          description: 'Failed to create project. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Project created successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onClose();
      setNewProject({
        name: '',
        customer_name: '',
        email: '',
        phone: '',
        address: '',
        project_type: 'DCR',
        payment_mode: 'Cash',
        proposal_amount: '',
        advance_payment: '',
        start_date: '',
      });
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'deleted' })
        .eq('id', projectId);

      if (error) {
        throw error;
      }

      setProjects(prevProjects => prevProjects.filter(project => project.id !== projectId));

      toast({
        title: 'Success',
        description: 'Project deleted successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete project. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const toggleProjectStatus = async (projectId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'completed' : 'active';
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId);

      if (error) {
        throw error;
      }

      setProjects(prevProjects => 
        prevProjects.map(project => 
          project.id === projectId 
            ? { ...project, status: newStatus }
            : project
        )
      );

      toast({
        title: 'Success',
        description: `Project marked as ${newStatus}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Error updating project status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project status. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box p={4}>
      <HStack justify="space-between" mb={4}>
        <Button colorScheme="blue" onClick={onOpen}>
          Create New Project
        </Button>
        <HStack>
          <Button 
            colorScheme={filter === 'all' ? 'blue' : 'gray'} 
            onClick={() => setFilter('all')}
          >
            All Projects
          </Button>
          <Button 
            colorScheme={filter === 'active' ? 'blue' : 'gray'} 
            onClick={() => setFilter('active')}
          >
            Active Projects
          </Button>
          <Button 
            colorScheme={filter === 'completed' ? 'blue' : 'gray'} 
            onClick={() => setFilter('completed')}
          >
            Completed Projects
          </Button>
        </HStack>
      </HStack>

      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Project Name</Th>
              <Th>Customer</Th>
              <Th>Type</Th>
              <Th>Payment Mode</Th>
              <Th>Total Amount</Th>
              <Th>Advance Paid</Th>
              <Th>Balance</Th>
              <Th>Start Date</Th>
              <Th>Duration</Th>
              <Th>Status</Th>
              <Th>Current Stage</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {projects.map(project => (
              <Tr key={project.id}>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  {project.name}
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  {project.customer_name}
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  <Badge colorScheme={project.project_type === 'DCR' ? 'green' : 'blue'}>
                    {project.project_type}
                  </Badge>
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  {project.payment_mode}
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  ₹{project.proposal_amount.toLocaleString()}
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  ₹{project.advance_payment.toLocaleString()}
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  ₹{project.balance_amount.toLocaleString()}
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  <Tooltip label={project.start_date ? `Project started on ${new Date(project.start_date).toLocaleDateString()}` : 'Start date not set'}>
                    <Text>{calculateElapsedTime(project.start_date)}</Text>
                  </Tooltip>
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  <Badge colorScheme={project.status === 'active' ? 'green' : 'blue'}>
                    {project.status}
                  </Badge>
                </Td>
                <Td onClick={() => navigate(`/projects/${project.id}`)} cursor="pointer">
                  {project.current_stage}
                </Td>
                <Td>
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      colorScheme={project.status === 'active' ? 'blue' : 'green'}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProjectStatus(project.id, project.status);
                      }}
                    >
                      {project.status === 'active' ? 'Mark Complete' : 'Mark Active'}
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
                          deleteProject(project.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Project</ModalHeader>
          <CloseButton position="absolute" right={2} top={2} onClick={onClose} />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Project Name</FormLabel>
                <Input
                  name="name"
                  value={newProject.name}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Customer Name</FormLabel>
                <Input
                  name="customer_name"
                  value={newProject.customer_name}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={newProject.email}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Phone</FormLabel>
                <Input
                  name="phone"
                  value={newProject.phone}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Address</FormLabel>
                <Input
                  name="address"
                  value={newProject.address}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Project Start Date</FormLabel>
                <Input
                  name="start_date"
                  type="date"
                  value={newProject.start_date}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Project Type</FormLabel>
                <Select
                  name="project_type"
                  value={newProject.project_type}
                  onChange={(e) => setNewProject(prev => ({
                    ...prev,
                    project_type: e.target.value
                  }))}
                >
                  <option value="DCR">DCR</option>
                  <option value="Non DCR">Non DCR</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Payment Mode</FormLabel>
                <Select
                  name="payment_mode"
                  value={newProject.payment_mode}
                  onChange={(e) => setNewProject(prev => ({
                    ...prev,
                    payment_mode: e.target.value
                  }))}
                >
                  <option value="Cash">Cash</option>
                  <option value="Loan">Loan</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Total Amount</FormLabel>
                <Input
                  name="proposal_amount"
                  type="number"
                  value={newProject.proposal_amount}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Advance Payment</FormLabel>
                <Input
                  name="advance_payment"
                  type="number"
                  value={newProject.advance_payment}
                  onChange={handleInputChange}
                  max={newProject.proposal_amount}
                />
              </FormControl>

              <Button colorScheme="blue" width="full" onClick={handleSubmit}>
                Create Project
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Projects; 