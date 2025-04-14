import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Text,
  VStack,
  HStack,
  Card,
  CardHeader,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Tooltip,
  Button,
} from '@chakra-ui/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Project {
  id: string;
  name: string;
  customer_name: string;
  status: string;
  current_stage: string;
  proposal_amount: number;
  created_at: string;
  start_date: string;
  kwh: number;
}

// Utility function to calculate elapsed time since start date - same as in Projects.tsx
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

// For backward compatibility - keeping this function for any existing code that might use it
const getTimeElapsed = (timestamp: string) => {
  const now = new Date();
  const projectDate = new Date(timestamp);
  const diffInMillis = now.getTime() - projectDate.getTime();
  
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

const Dashboard = () => {
  const { isAuthenticated, user } = useAuth();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalRevenue: 0,
    totalKwh: 0,
  });
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'stage'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Check if current user is contact@axisogreen.in
  const isRestrictedUser = user?.email === 'contact@axisogreen.in';

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  const fetchStats = async () => {
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .neq('status', 'deleted');

      if (error) throw error;

      if (projects) {
        // Get unique customer names for total customers count
        const uniqueCustomers = [...new Set(projects.map((p: Project) => p.customer_name))];
        const active = projects.filter((p: Project) => p.status === 'active');
        const completed = projects.filter((p: Project) => p.status === 'completed');
        const totalRevenue = projects.reduce((sum: number, p: Project) => sum + (p.proposal_amount || 0), 0);
        const totalKwh = projects.reduce((sum: number, p: Project) => sum + (p.kwh || 0), 0);

        setStats({
          totalCustomers: uniqueCustomers.length,
          activeProjects: active.length,
          completedProjects: completed.length,
          totalRevenue,
          totalKwh,
        });

        // Sort active projects by selected criteria
        sortProjects(active);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to sort projects based on selected criteria
  const sortProjects = (projects: Project[]) => {
    let sortedProjects = [...projects];
    
    if (sortBy === 'date') {
      sortedProjects.sort((a, b) => {
        const currentDate = new Date().getTime();
        
        // Get timestamps for start dates
        const dateA = a.start_date ? new Date(a.start_date).getTime() : new Date(a.created_at).getTime();
        const dateB = b.start_date ? new Date(b.start_date).getTime() : new Date(b.created_at).getTime();
        
        // Calculate durations in milliseconds
        const durationA = currentDate - dateA;
        const durationB = currentDate - dateB;
        
        // Sort by duration (shorter duration means more recent start date)
        return sortOrder === 'asc' ? durationA - durationB : durationB - durationA;
      });
    } else if (sortBy === 'amount') {
      sortedProjects.sort((a, b) => {
        return sortOrder === 'asc' 
          ? a.proposal_amount - b.proposal_amount
          : b.proposal_amount - a.proposal_amount;
      });
    } else if (sortBy === 'stage') {
      sortedProjects.sort((a, b) => {
        return sortOrder === 'asc'
          ? a.current_stage.localeCompare(b.current_stage)
          : b.current_stage.localeCompare(a.current_stage);
      });
    }
    
    setActiveProjects(sortedProjects);
  };

  // Handle sort change
  const handleSortChange = (criteria: 'date' | 'amount' | 'stage') => {
    if (sortBy === criteria) {
      // Toggle order if same criteria is selected
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new criteria and default to descending
      setSortBy(criteria);
      setSortOrder('desc');
    }
  };

  // Sort projects when sort criteria changes
  useEffect(() => {
    if (activeProjects.length > 0) {
      sortProjects(activeProjects);
    }
  }, [sortBy, sortOrder]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <VStack spacing={4}>
          <Text fontSize="lg">Loading dashboard...</Text>
          <Progress size="xs" isIndeterminate w="200px" />
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <VStack spacing={8} align="stretch">
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: `repeat(${isRestrictedUser ? 4 : 5}, 1fr)` }} gap={6}>
          <Stat>
            <StatLabel>Total Customers</StatLabel>
            <StatNumber>{stats.totalCustomers}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Active Projects</StatLabel>
            <StatNumber>{stats.activeProjects}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Completed Projects</StatLabel>
            <StatNumber>{stats.completedProjects}</StatNumber>
          </Stat>
          {!isRestrictedUser && (
            <Stat>
              <StatLabel>Total Revenue</StatLabel>
              <StatNumber>₹{stats.totalRevenue.toLocaleString()}</StatNumber>
            </Stat>
          )}
          <Stat>
            <StatLabel>Total KWH</StatLabel>
            <StatNumber>{stats.totalKwh.toLocaleString()} kW</StatNumber>
          </Stat>
        </Grid>

        <Card>
          <CardHeader>
            <HStack justifyContent="space-between">
              <Heading size="md">Active Projects</Heading>
              <HStack spacing={2}>
                <Button
                  size="sm"
                  colorScheme={sortBy === 'date' ? 'blue' : 'gray'}
                  onClick={() => handleSortChange('date')}
                  leftIcon={sortBy === 'date' ? <Box as="span">{sortOrder === 'asc' ? '↑' : '↓'}</Box> : undefined}
                >
                  Duration
                </Button>
                <Button
                  size="sm"
                  colorScheme={sortBy === 'amount' ? 'blue' : 'gray'}
                  onClick={() => handleSortChange('amount')}
                  leftIcon={sortBy === 'amount' ? <Box as="span">{sortOrder === 'asc' ? '↑' : '↓'}</Box> : undefined}
                >
                  Amount
                </Button>
                <Button
                  size="sm"
                  colorScheme={sortBy === 'stage' ? 'blue' : 'gray'}
                  onClick={() => handleSortChange('stage')}
                  leftIcon={sortBy === 'stage' ? <Box as="span">{sortOrder === 'asc' ? '↑' : '↓'}</Box> : undefined}
                >
                  Stage
                </Button>
              </HStack>
            </HStack>
          </CardHeader>
          <CardBody>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Project Name</Th>
                  <Th>Customer</Th>
                  <Th>Current Stage</Th>
                  <Th>Amount</Th>
                  <Th>KWH</Th>
                  <Th>Duration</Th>
                </Tr>
              </Thead>
              <Tbody>
                {activeProjects.map((project) => (
                  <Tr key={project.id}>
                    <Td>{project.name}</Td>
                    <Td>{project.customer_name}</Td>
                    <Td>
                      <Badge colorScheme="blue">{project.current_stage}</Badge>
                    </Td>
                    <Td>₹{project.proposal_amount.toLocaleString()}</Td>
                    <Td>{project.kwh || 'N/A'}</Td>
                    <Td>
                      <Tooltip label={project.start_date ? `Project started on ${new Date(project.start_date).toLocaleDateString()}` : 'Start date not set'}>
                        <Text>{calculateElapsedTime(project.start_date)}</Text>
                      </Tooltip>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default Dashboard; 