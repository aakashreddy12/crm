import { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Grid,
  Stat as ChakraStat,
  StatLabel,
  StatNumber,
  Progress as ChakraProgress,
  HStack,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Select,
  Flex,
  VStack,
} from '@chakra-ui/react';
import { supabase } from '../lib/supabase';
import { PROJECT_STAGES } from '../lib/constants';

interface Project {
  id: string;
  status: string;
  current_stage: string;
  proposal_amount: number;
  created_at: string;
}

const Reports = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalRevenue: 0,
  });
  const [stageStats, setStageStats] = useState<Record<string, number>>({});
  const [monthlyStats, setMonthlyStats] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get current year and create an array of years (current year and 4 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  useEffect(() => {
    fetchStats();
  }, [selectedYear]); // Refetch when year changes

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching projects from Supabase...');
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .neq('status', 'deleted');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Projects fetched:', projects);

      if (projects) {
        const active = projects.filter((p: Project) => p.status === 'active');
        const completed = projects.filter((p: Project) => p.status === 'completed');
        const totalRevenue = projects.reduce((sum: number, p: Project) => sum + (p.proposal_amount || 0), 0);

        setStats({
          totalCustomers: projects.length,
          activeProjects: active.length,
          completedProjects: completed.length,
          totalRevenue,
        });

        // Calculate projects in each stage (excluding deleted projects)
        const stages: Record<string, number> = {};
        PROJECT_STAGES.forEach(stage => {
          stages[stage] = projects.filter((p: Project) => p.current_stage === stage).length;
        });
        setStageStats(stages);

        // Calculate monthly project counts for the selected year
        const monthCounts: Record<string, number> = {
          'January': 0, 'February': 0, 'March': 0, 'April': 0, 'May': 0, 'June': 0,
          'July': 0, 'August': 0, 'September': 0, 'October': 0, 'November': 0, 'December': 0
        };
        
        const monthNames = Object.keys(monthCounts);
        
        projects.forEach((project: Project) => {
          const createdDate = new Date(project.created_at);
          const projectYear = createdDate.getFullYear();
          const projectMonth = createdDate.getMonth(); // 0-11
          
          if (projectYear === selectedYear) {
            monthCounts[monthNames[projectMonth]]++;
          }
        });
        
        setMonthlyStats(monthCounts);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch reports data');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate the maximum project count for any month to set the bar scale
  const maxMonthlyCount = monthlyStats ? Math.max(...Object.values(monthlyStats), 1) : 1;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" color="green.500" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" minH="400px">
        <AlertIcon boxSize="40px" mr={0} />
        <AlertTitle mt={4} mb={1} fontSize="lg">Error Loading Reports</AlertTitle>
        <AlertDescription maxWidth="sm">{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Box>
      <Text fontSize="2xl" mb="6">Reports & Analytics</Text>

      <Grid templateColumns="repeat(4, 1fr)" gap={6} mb="8">
        <ChakraStat bg="white" p="4" borderRadius="lg" boxShadow="sm">
          <StatLabel>Total Customers</StatLabel>
          <StatNumber>{stats.totalCustomers}</StatNumber>
        </ChakraStat>

        <ChakraStat bg="white" p="4" borderRadius="lg" boxShadow="sm">
          <StatLabel>Active Projects</StatLabel>
          <StatNumber>{stats.activeProjects}</StatNumber>
        </ChakraStat>

        <ChakraStat bg="white" p="4" borderRadius="lg" boxShadow="sm">
          <StatLabel>Completed Projects</StatLabel>
          <StatNumber>{stats.completedProjects}</StatNumber>
        </ChakraStat>

        <ChakraStat bg="white" p="4" borderRadius="lg" boxShadow="sm">
          <StatLabel>Total Revenue</StatLabel>
          <StatNumber>₹{stats.totalRevenue.toLocaleString()}</StatNumber>
        </ChakraStat>
      </Grid>

      <Box bg="white" p="6" borderRadius="lg" boxShadow="sm" mb="8">
        <Flex justify="space-between" align="center" mb="4">
          <Text fontSize="lg" fontWeight="bold">Projects by Month</Text>
          <Select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            width="150px"
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </Flex>
        
        <Flex height="250px" alignItems="flex-end" mb="2">
          {Object.entries(monthlyStats).map(([month, count]) => (
            <VStack key={month} flex="1" spacing="0">
              <Box 
                height={`${Math.max((count / maxMonthlyCount) * 200, count ? 20 : 0)}px`}
                width="70%" 
                bg="green.500"
                borderTopRadius="md"
                position="relative"
              >
                {count > 0 && (
                  <Text 
                    position="absolute"
                    top="-20px"
                    left="50%"
                    transform="translateX(-50%)"
                    color="black"
                    fontWeight="bold"
                    fontSize="sm"
                  >
                    {count}
                  </Text>
                )}
              </Box>
              <Text 
                fontSize="xs" 
                fontWeight="medium" 
                pt="2"
                transform="rotate(-45deg)" 
                transformOrigin="top left"
                width="100%"
                textAlign="center"
                height="60px"
                overflow="visible"
              >
                {month.substring(0, 3)}
              </Text>
            </VStack>
          ))}
        </Flex>
      </Box>

      <Box bg="white" p="6" borderRadius="lg" boxShadow="sm">
        <Text fontSize="lg" fontWeight="bold" mb="4">Project Stages</Text>
        {PROJECT_STAGES.map(stage => (
          <HStack key={stage} mb="3">
            <Text minW="200px">{stage}</Text>
            <ChakraProgress
              value={100}
              flex="1"
              colorScheme="blue"
              opacity={stageStats[stage] ? 1 : 0.3}
            />
            <Text minW="100px">{stageStats[stage] || 0} projects</Text>
          </HStack>
        ))}
      </Box>
    </Box>
  );
};

export default Reports; 